import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cookie-authenticated Supabase client (runs as the logged-in user → satisfies
// the question_cards RLS policies for read/insert).
function serverClient() {
  const store = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => store.get(n)?.value, set() {}, remove() {} } }
  )
}

// AI Study Assistant — structured "Insight Card" + focused follow-ups.
// Google Gemini (free tier). Server-side only so the key is never exposed.
// Design goal: maximize learning per request — short, structured, on-demand.

const MODEL = 'gemini-2.5-flash'   // GA Flash: stable, free-tier friendly
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

type Ctx = {
  question_id?: string      // stable id → used as the shared-cache key
  question_text: string
  options: string[]
  correct_indices: number[]
  selected_indices: number[]
  topic: string
  explanation: string
}

const letters = (arr: number[]) => arr.map(i => OPTION_LABELS[i]).join(', ') || '—'
const optionsBlock = (c: Ctx) => c.options.map((o, i) => `${OPTION_LABELS[i]}. ${o}`).join('\n')

// Structured-output schema for the Insight Card (keeps replies tiny + consistent).
const CARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    why_correct: { type: 'STRING' },
    distractors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { letter: { type: 'STRING' }, why: { type: 'STRING' } },
        required: ['letter', 'why'],
      },
    },
    exam_keyword: { type: 'STRING' },
    real_world: { type: 'STRING' },
    misconception: { type: 'STRING' },
    memory_trick: { type: 'STRING' },
  },
  required: ['why_correct', 'distractors', 'exam_keyword', 'real_world', 'misconception', 'memory_trick'],
  propertyOrdering: ['why_correct', 'distractors', 'exam_keyword', 'real_world', 'misconception', 'memory_trick'],
}

function cardSystem(c: Ctx): string {
  return [
    'You are a concise AWS SAA-C03 exam coach. Output JSON ONLY, matching the provided schema.',
    'Rules:',
    '- Every field is PLAIN TEXT (no markdown, no asterisks).',
    '- Keep each field about 25 words or fewer. Be specific to THIS question. Never explain unrelated services.',
    '- distractors: include one entry for EVERY option that is NOT correct — its letter and a one-line reason it is wrong or worse.',
    '- why_correct: the key reason the correct answer wins.',
    '- exam_keyword: the phrase in the question that signals the answer.',
    '- real_world: a one-line real scenario where this applies.',
    '- misconception: the trap that makes students pick a wrong option.',
    '- memory_trick: a short, sticky mnemonic.',
    '',
    `Topic: ${c.topic || 'General'}`,
    `Question: ${c.question_text}`,
    `Options:\n${optionsBlock(c)}`,
    `Correct answer: ${letters(c.correct_indices)}`,
    c.explanation ? `Reference explanation: ${c.explanation.slice(0, 500)}` : '',
  ].filter(Boolean).join('\n')
}

function followupSystem(c: Ctx, card: unknown): string {
  return [
    'You are a concise AWS SAA-C03 coach helping with ONE specific exam question.',
    'Answer the student\'s follow-up in PLAIN TEXT, under 90 words. Short bullet lines are fine. No markdown symbols.',
    'Stay strictly on THIS question and its concept. If the follow-up is off-topic, say briefly that it is beyond this question.',
    '',
    `Question: ${c.question_text}`,
    `Correct answer: ${letters(c.correct_indices)}`,
    card ? `Key points already shown to the student: ${JSON.stringify(card).slice(0, 700)}` : '',
  ].filter(Boolean).join('\n')
}

async function callGemini(key: string, body: object): Promise<Response | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  let r: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    })
    if (r.ok) return r
    if ([429, 500, 503].includes(r.status) && attempt < 2) {
      await r.text().catch(() => {})
      await new Promise(res => setTimeout(res, 700 * (attempt + 1)))
      continue
    }
    return r
  }
  return r
}

function busyMessage(status: number) {
  return status === 429 || status === 503 || status === 500
    ? 'The AI coach is busy right now — please try again in a few seconds.'
    : 'The AI coach had a problem. Please try again.'
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'AI coach is not configured yet (missing GEMINI_API_KEY).' }, { status: 503 })

  let mode: string, context: Ctx, card: unknown, question: string
  try {
    const b = await req.json()
    mode = b.mode || 'card'
    context = b.context
    card = b.card
    question = b.question
    if (!context) throw new Error('no context')
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // ---- Focused follow-up (plain short text) ----
  if (mode === 'followup') {
    if (!question) return NextResponse.json({ error: 'Missing question.' }, { status: 400 })
    const body = {
      systemInstruction: { parts: [{ text: followupSystem(context, card) }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
    }
    const r = await callGemini(key, body)
    if (!r || !r.ok) return NextResponse.json({ error: busyMessage(r?.status ?? 0) }, { status: 502 })
    const data = await r.json()
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text || '').join('').trim()
    return NextResponse.json({ text: text || 'No answer — try rephrasing.' })
  }

  // ---- Insight Card (structured JSON) ----
  // Shared cache: a card depends only on the question, so generate once and
  // reuse for every student. Keyed by question_id.
  const qid = context.question_id
  const sb = qid ? serverClient() : null
  if (sb && qid) {
    const { data: cached } = await sb.from('question_cards').select('card').eq('question_id', qid).maybeSingle()
    if (cached?.card) return NextResponse.json({ card: cached.card, cached: true })
  }

  const body = {
    systemInstruction: { parts: [{ text: cardSystem(context) }] },
    contents: [{ role: 'user', parts: [{ text: 'Generate the insight card as JSON.' }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 700,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
      responseSchema: CARD_SCHEMA,
    },
  }
  const r = await callGemini(key, body)
  if (!r || !r.ok) return NextResponse.json({ error: busyMessage(r?.status ?? 0) }, { status: 502 })
  const data = await r.json()
  const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text || '').join('').trim()
  try {
    const parsed = JSON.parse(raw)
    // Save to the shared cache so the next student (or revisit) is free + instant.
    if (sb && qid) {
      try {
        await sb.from('question_cards').upsert({ question_id: qid, card: parsed }, { onConflict: 'question_id', ignoreDuplicates: true })
      } catch { /* cache write is best-effort */ }
    }
    return NextResponse.json({ card: parsed })
  } catch {
    console.error('Card parse failed:', raw.slice(0, 300))
    return NextResponse.json({ error: 'The coach returned an unexpected format. Please try again.' }, { status: 502 })
  }
}
