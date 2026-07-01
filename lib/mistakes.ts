import { createClient } from './supabase'
import type { Question } from './types'

// "My Mistakes" — a persistent, manually-curated deck. Unlike the auto wrong-
// answers deck (which drops a question the moment you answer it right again),
// entries here stay until YOU decide you've mastered it and remove it.

export async function fetchMistakeIds(): Promise<Set<string>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data } = await supabase.from('mistake_bank').select('question_id').eq('user_id', user.id)
  return new Set((data ?? []).map((r: { question_id: string }) => r.question_id))
}

// Add a question to the deck if it isn't already there. Safe to call every
// time a question is answered wrong — upsert with ignoreDuplicates keeps the
// original added_at (and doesn't re-surface something already removed by hand
// ... actually it WILL re-add it, since "removed" means the row is gone. That's
// intentional: missing it again means it's still a weak spot).
export async function addMistake(questionId: string, bankId: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('mistake_bank').upsert(
    { user_id: user.id, question_id: questionId, bank_id: bankId || null },
    { onConflict: 'user_id,question_id', ignoreDuplicates: true }
  )
}

// The user explicitly marking a question as mastered — removes it from the deck.
export async function removeMistake(questionId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('mistake_bank').delete().eq('user_id', user.id).eq('question_id', questionId)
}

// Full question rows for the deck, oldest-added first (study what's lingered longest).
export async function fetchMistakeQuestions(): Promise<Question[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: rows } = await supabase
    .from('mistake_bank')
    .select('question_id')
    .eq('user_id', user.id)
    .order('added_at', { ascending: true })
  const ids = (rows ?? []).map((r: { question_id: string }) => r.question_id)
  if (ids.length === 0) return []
  const { data: qs } = await supabase.from('questions').select('*').in('id', ids)
  const rank = new Map(ids.map((id, i) => [id, i]))
  return ((qs ?? []) as Question[]).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
}
