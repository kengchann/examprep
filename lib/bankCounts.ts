import { createClient } from './supabase'

// Real per-bank question counts, without shipping every row over the wire.
//
// The stored question_banks.question_count column drifts after bulk imports,
// so screens want the live count — but the old approach fetched every
// question's bank_id (946+ rows of egress on each dashboard/banks load) just
// to tally them client-side. Instead we issue one head-only COUNT per bank:
// `head: true` returns NO rows (the count comes back in the Content-Range
// header), so egress is effectively zero regardless of bank size. A handful of
// tiny requests replaces a full-table scan.
export async function fetchBankQuestionCounts(bankIds: string[]): Promise<Record<string, number>> {
  const supabase = createClient()
  const entries = await Promise.all(
    bankIds.map(async id => {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('bank_id', id)
      return [id, count ?? 0] as const
    })
  )
  return Object.fromEntries(entries)
}
