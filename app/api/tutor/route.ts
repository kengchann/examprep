import { NextRequest, NextResponse } from 'next/server'

// AI Study Assistant — a question-scoped tutor powered by Google Gemini.
// Uses the free Gemini API (GEMINI_API_KEY). Server-side only so the key is
// never exposed to the browser.

const MODEL = 'gemini-3-flash-preview'
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

type TutorContext = {
  question_text: string
  options: string[]
  correct_indices: number[]
  selected_indices: number[]
  topic: string
  explanation: string
}

type ChatMsg = { role: 'user' | 'model'; text: string }

function buildSystemPrompt(c: TutorContext): string {
  const opts = c.options.map((o, i) => `${OPTION_LABELS[i]}. ${o}`).join('\n')
  const letters = (arr: number[]) => arr.map(i => OPTION_LABELS[i]).join(', ') || '—'
  const studentAns = c.selected_indices.length ? letters(c.selected_indices) : '(skipped / no answer)'
  return [
    'You are an expert AWS Solutions Architect (SAA-C03) tutor helping a student understand ONE specific exam question.',
    'Your goal is deep understanding, not memorization. Be clear, concise, and encouraging.',
    '',
    'Guidelines:',
    '- Stay focused on THIS question and the AWS concepts it tests. If asked something unrelated, gently steer back.',
    '- When asked, explain why the correct answer is right and why specific wrong options are wrong.',
    '- Offer real-world examples, service comparisons, and analogies when they aid understanding.',
    '- If asked to quiz the student, ask one focused question at a time and react to their answer.',
    '- If the student got it wrong, name the likely misconception behind their mistake.',
    '- Use plain text and short paragraphs. Avoid large markdown tables. Keep answers focused, not padded.',
    '',
    '--- QUESTION CONTEXT ---',
    `Topic: ${c.topic || 'General'}`,
    `Question: ${c.question_text}`,
    'Options:',
    opts,
    `Correct answer: ${letters(c.correct_indices)}`,
    `Student's answer: ${studentAns}`,
    c.explanation ? `Official explanation: ${c.explanation}` : 'Official explanation: (none provided)',
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'AI tutor is not configured yet (missing GEMINI_API_KEY).' }, { status: 503 })
  }

  let context: TutorContext
  let messages: ChatMsg[]
  try {
    const body = await req.json()
    context = body.context
    messages = body.messages
    if (!context || !Array.isArray(messages) || messages.length === 0) throw new Error('bad payload')
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(context) }] },
    contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const detail = await r.text()
      console.error('Gemini error:', r.status, detail)
      const msg = r.status === 429
        ? 'The AI tutor is busy (free-tier rate limit). Try again in a moment.'
        : 'The AI tutor had a problem. Please try again.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    const data = await r.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const text = parts.map((p: { text?: string }) => p.text || '').join('').trim()
    if (!text) {
      return NextResponse.json({ error: 'The tutor could not respond to that. Try rephrasing.' }, { status: 200 })
    }
    return NextResponse.json({ text })
  } catch (e) {
    console.error('Tutor route error:', e)
    return NextResponse.json({ error: 'Could not reach the AI tutor.' }, { status: 502 })
  }
}
