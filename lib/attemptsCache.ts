import { createClient } from './supabase'
import type { AttemptResult } from './types'

// One shared, session-cached fetch of the user's recent attempts.
//
// Several screens each independently pulled the attempts table WITH the full
// `details` JSON (every past question's text/options/explanation): the
// dashboard (gamification stats + weak areas), the Study page, the Review
// screen. `details` is by far the heaviest payload in the app, and it was
// re-downloaded 2–5× as the user moved between screens — the main driver of
// Supabase egress.
//
// Now every consumer reads from here. The result is cached per user for a
// short window and reused, so a burst of navigation costs ONE fetch instead of
// several. The cache is invalidated the moment a new attempt is saved (see
// invalidateAttempts, called from the exam submit path), so stats never go
// stale after finishing an exam.
//
// Bounded to 300 attempts (was unbounded on the Study/Review screens). 300
// completed exams is already deep history; older attempts fall off, which is
// fine since every consumer keys on the MOST RECENT outcome per question.

export type AttemptRow = {
  bank_id: string | null
  bank_name: string
  score: number
  correct: number
  total: number
  elapsed_seconds: number | null
  created_at: string
  details: AttemptResult[] | null
}

const LIMIT = 300
const TTL = 60_000   // 1 min — long enough to dedupe a navigation burst

let cache: { userId: string; at: number; data: Promise<AttemptRow[]> } | null = null

export async function fetchRecentAttempts(): Promise<AttemptRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  if (cache && cache.userId === user.id && Date.now() - cache.at < TTL) {
    return cache.data
  }

  const p = (async () => {
    try {
      const { data } = await supabase
        .from('attempts')
        .select('bank_id, bank_name, score, correct, total, elapsed_seconds, created_at, details')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(LIMIT)
      return (data ?? []) as AttemptRow[]
    } catch {
      cache = null            // don't leave a failed fetch cached
      return [] as AttemptRow[]
    }
  })()

  cache = { userId: user.id, at: Date.now(), data: p }
  return p
}

// Drop the cache so the next read reflects a just-saved attempt.
export function invalidateAttempts() {
  cache = null
}
