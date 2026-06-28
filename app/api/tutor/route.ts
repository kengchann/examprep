import { NextRequest, NextResponse } from 'next/server'

// AI Study Assistant — a question-scoped tutor powered by Google Gemini.
// Uses the free Gemini API (GEMINI_API_KEY). Server-side only so the key is
// never exposed to the browser.

// GA Flash model — stable and well within the free tier. (Preview models like
// gemini-3-flash-preview work too but get overloaded / rate-limited more often.)
const MODEL = 'gemini-2.5-flash'
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
    'Your goal is deep understanding, not memorization. Be warm, clear, and encouraging — like a patient tutor.',
    '',
    'Guidelines:',
    '- Write in PLAIN TEXT only. Do NOT use markdown: no asterisks for bold, no "#" headings, no tables, no backticks. The chat displays raw text, so any markdown symbols appear literally and look broken.',
    '- Keep replies short and focused — usually 2 to 4 short paragraphs. Get to the point; never pad.',
    '- Stay on THIS question and the AWS concepts it tests. If asked something unrelated, gently steer back.',
    '- When explaining, name the KEY distinction that makes the right answer right and a wrong option wrong — not a wall of text on every option unless asked.',
    '- Use real-world examples, simple analogies, and service comparisons when they aid understanding.',
    '- If asked to quiz the student, ask ONE focused question at a time and wait for their answer before continuing.',
    '- If the student got it wrong, gently name the likely misconception behind their mistake.',
    '- When useful, end with a short check like "Does that click?" to keep it interactive.',
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
    // thinkingBudget: 0 keeps replies fast and prevents "thinking" from eating
    // the output budget. temperature for a little warmth.
    generationConfig: { maxOutputTokens: 1200, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
  try {
    // Retry transient overload / rate-limit responses (429/500/503) a couple of times.
    let r: Response | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
      })
      if (r.ok) break
      if ([429, 500, 503].includes(r.status) && attempt < 2) {
        await r.text().catch(() => {})   // drain body before retrying
        await new Promise(res => setTimeout(res, 700 * (attempt + 1)))
        continue
      }
      break
    }
    if (!r || !r.ok) {
      const status = r?.status ?? 0
      const detail = r ? await r.text().catch(() => '') : ''
      console.error('Gemini error:', status, detail)
      const msg = status === 429 || status === 503 || status === 500
        ? 'The AI tutor is busy right now — please try again in a few seconds.'
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
