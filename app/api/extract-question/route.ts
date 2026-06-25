import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `You extract a single multiple-choice exam question from a screenshot of an exam/quiz application (e.g. a VCE-style simulator).

Return ONLY the structured data. Rules:
- question_text: the full question stem, including any scenario/background paragraph. Preserve line breaks. Do NOT include the answer options here, and do NOT include a leading "Question N" label.
- options: each answer choice as a separate string, WITHOUT its letter prefix (strip "A.", "B)", etc.). For a True/False question use exactly ["True","False"].
- question_type: "truefalse" if the only options are True/False; "multiple" if the question says to choose two or more (e.g. "(Choose two.)") or otherwise has multiple correct answers; otherwise "single".
- correct_indices: 0-based indices of the correct option(s). Only fill this if the screenshot clearly marks the correct answer(s) (highlight, check, "Correct Answer:" text). If the screenshot does NOT reveal the answer, return an empty array — the human will set it.
- explanation: any explanation/rationale shown in the screenshot; otherwise an empty string.
- topic: a short topic/domain if visible or obvious from the content; otherwise "General".`

const SCHEMA = {
  type: 'object',
  properties: {
    question_text: { type: 'string' },
    question_type: { type: 'string', enum: ['single', 'multiple', 'truefalse'] },
    options: { type: 'array', items: { type: 'string' } },
    correct_indices: { type: 'array', items: { type: 'integer' } },
    explanation: { type: 'string' },
    topic: { type: 'string' },
  },
  required: ['question_text', 'question_type', 'options', 'correct_indices', 'explanation', 'topic'],
  additionalProperties: false,
} as const

const ALLOWED_MEDIA = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Screenshot import is not configured. Add ANTHROPIC_API_KEY to the server environment.' },
      { status: 503 },
    )
  }

  let body: { image?: string; mediaType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { image, mediaType } = body
  if (!image) return NextResponse.json({ error: 'No image provided.' }, { status: 400 })
  if (!mediaType || !ALLOWED_MEDIA.includes(mediaType)) {
    return NextResponse.json({ error: 'Unsupported image type. Use PNG, JPEG, GIF, or WebP.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/png', data: image } },
            { type: 'text', text: 'Extract the exam question from this screenshot.' },
          ],
        },
      ],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Could not read a question from that image.' }, { status: 422 })
    }
    const parsed = JSON.parse(textBlock.text)
    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
