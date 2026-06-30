// Lightweight spaced repetition (Leitner-style), stored on-device in
// localStorage — no backend, no migration. Each question advances through boxes
// with growing intervals when answered correctly, and resets when missed.
//
// (Per-device for now; can be upgraded to a cloud table later for cross-device.)

const KEY = 'examprep_srs'
const DAY = 86_400_000
// Days until next review, indexed by box. Box 0 = brand new / just lapsed.
const INTERVALS = [0, 1, 3, 7, 16, 45]

export type SRState = { box: number; due: number }   // due = epoch ms

function load(): Record<string, SRState> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function save(m: Record<string, SRState>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch {}
}

export function getSrs(): Record<string, SRState> {
  return load()
}

// Update one question's schedule after a review.
function step(cur: SRState | undefined, correct: boolean): SRState {
  const box = correct ? Math.min((cur?.box ?? 0) + 1, INTERVALS.length - 1) : 1
  return { box, due: Date.now() + INTERVALS[box] * DAY }
}

// Apply a batch of results (called after a Review Queue session finishes).
export function applyResults(results: { questionId: string; correct: boolean }[]) {
  const m = load()
  for (const r of results) m[r.questionId] = step(m[r.questionId], r.correct)
  save(m)
}

// How many of the given question ids are due now (for badges/summaries).
export function dueAmong(ids: string[]): number {
  const m = load()
  const now = Date.now()
  return ids.filter(id => m[id] && m[id].due <= now).length
}
