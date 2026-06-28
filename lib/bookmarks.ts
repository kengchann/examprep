import { createClient } from './supabase'
import type { Question } from './types'

// Cloud-synced bookmarks ("starred" questions). One row per (user, question).

// All question ids the current user has starred.
export async function fetchBookmarkIds(): Promise<Set<string>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data } = await supabase.from('bookmarks').select('question_id').eq('user_id', user.id)
  return new Set((data ?? []).map((r: { question_id: string }) => r.question_id))
}

export async function addBookmark(questionId: string, bankId: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // Upsert so re-starring never errors on the unique (user, question) key.
  await supabase.from('bookmarks').upsert(
    { user_id: user.id, question_id: questionId, bank_id: bankId || null },
    { onConflict: 'user_id,question_id' }
  )
}

export async function removeBookmark(questionId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', questionId)
}

// Full question rows for every starred question, newest star first.
export async function fetchBookmarkedQuestions(): Promise<Question[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: bm } = await supabase
    .from('bookmarks')
    .select('question_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const ids = (bm ?? []).map((r: { question_id: string }) => r.question_id)
  if (ids.length === 0) return []
  const { data: qs } = await supabase.from('questions').select('*').in('id', ids)
  // Preserve the bookmark order (newest first); .in() doesn't guarantee order.
  const rank = new Map(ids.map((id, i) => [id, i]))
  return ((qs ?? []) as Question[]).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
}
