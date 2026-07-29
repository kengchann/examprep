import { createClient } from './supabase'
import { fetchBankQuestionCounts } from './bankCounts'
import type { Question } from './types'

// Per-session cache of a bank's full question rows.
//
// The exam screen needs every row of a bank (for the range / type / order
// controls), and used to re-download all ~946 rows — full text each — every
// time an exam or deck was started. Questions rarely change within a session,
// so we cache them in sessionStorage and reuse them.
//
// Freshness: we first fetch a live head-only COUNT (near-zero egress). If it
// matches the cached row count we serve the cache; otherwise we refetch the
// full rows and re-cache. This catches added/removed questions cheaply. A pure
// EDIT that leaves the count unchanged can be served stale for the rest of the
// tab session — acceptable for a student mid-session; a reload refreshes it.

const cacheKey = (bankId: string) => `examprep_bank_${bankId}`

export async function fetchBankQuestions(bankId: string): Promise<Question[]> {
  const counts = await fetchBankQuestionCounts([bankId])
  const liveCount = counts[bankId] ?? 0

  try {
    const raw = sessionStorage.getItem(cacheKey(bankId))
    if (raw) {
      const cached = JSON.parse(raw) as { count: number; questions: Question[] }
      if (cached.count === liveCount && cached.questions.length === liveCount) {
        return cached.questions
      }
    }
  } catch { /* ignore malformed cache */ }

  const supabase = createClient()
  const { data } = await supabase.from('questions').select('*').eq('bank_id', bankId).order('order_index')
  const questions = (data ?? []) as Question[]
  try {
    sessionStorage.setItem(cacheKey(bankId), JSON.stringify({ count: liveCount, questions }))
  } catch { /* over quota or disabled — just skip caching */ }
  return questions
}
