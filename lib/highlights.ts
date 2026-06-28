import { createClient } from './supabase'

// Personal, per-question highlights a student creates by selecting text.
// We store the highlighted SUBSTRINGS (not DOM ranges) so they survive
// re-renders and option shuffling. One row per (user, question).

export type HighlightMap = Map<string, string[]>   // questionId -> phrases

export async function fetchHighlightMap(): Promise<HighlightMap> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Map()
  const { data } = await supabase
    .from('question_highlights')
    .select('question_id, phrases')
    .eq('user_id', user.id)
  const map: HighlightMap = new Map()
  for (const row of (data ?? []) as { question_id: string; phrases: string[] | null }[]) {
    map.set(row.question_id, row.phrases ?? [])
  }
  return map
}

// Save the full phrase list for one question (empty array clears it).
export async function saveHighlights(questionId: string, phrases: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (phrases.length === 0) {
    await supabase.from('question_highlights').delete()
      .eq('user_id', user.id).eq('question_id', questionId)
    return
  }
  await supabase.from('question_highlights').upsert(
    { user_id: user.id, question_id: questionId, phrases, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,question_id' }
  )
}
