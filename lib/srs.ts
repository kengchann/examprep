import { createClient } from './supabase'

// Cloud-synced spaced repetition (Leitner-style). Each question advances
// through boxes with growing intervals when answered correctly, and resets to
// box 1 when missed. Stored in Supabase so progress follows the student across
// devices, same as everything else in the app.

const DAY = 86_400_000
// Days until next review, indexed by box. Box 0 = brand new / just lapsed.
const INTERVALS = [0, 1, 3, 7, 16, 45]

export type SRState = { box: number; due: number }   // due = epoch ms

// All scheduled questions for the current user.
export async function fetchSrs(): Promise<Record<string, SRState>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase.from('srs_schedule').select('question_id, box, due_at').eq('user_id', user.id)
  const m: Record<string, SRState> = {}
  for (const row of (data ?? []) as { question_id: string; box: number; due_at: string }[]) {
    m[row.question_id] = { box: row.box, due: new Date(row.due_at).getTime() }
  }
  return m
}

function step(cur: SRState | undefined, correct: boolean): SRState {
  const box = correct ? Math.min((cur?.box ?? 0) + 1, INTERVALS.length - 1) : 1
  return { box, due: Date.now() + INTERVALS[box] * DAY }
}

// Apply a batch of results (called after a Review Queue / SRS session finishes).
export async function applyResults(results: { questionId: string; correct: boolean }[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || results.length === 0) return

  const ids = results.map(r => r.questionId)
  const { data: existing } = await supabase
    .from('srs_schedule').select('question_id, box, due_at').eq('user_id', user.id).in('question_id', ids)
  const cur = new Map((existing ?? []).map((r: { question_id: string; box: number; due_at: string }) =>
    [r.question_id, { box: r.box, due: new Date(r.due_at).getTime() }]))

  const rows = results.map(r => {
    const next = step(cur.get(r.questionId), r.correct)
    return { user_id: user.id, question_id: r.questionId, box: next.box, due_at: new Date(next.due).toISOString(), updated_at: new Date().toISOString() }
  })
  await supabase.from('srs_schedule').upsert(rows, { onConflict: 'user_id,question_id' })
}
