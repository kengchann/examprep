import { createClient } from './supabase'

// Personal, per-question highlights a student creates by selecting text.
// We store the highlighted SUBSTRINGS (not DOM ranges) so they survive
// re-renders and option shuffling. One row per (user, question).
//
// Each entry is SCOPED to the block of text it was made in — the question, or
// one specific option — stored as `scope + SEP + phrase`. Without this,
// highlighting "queue" in option A also lit up "queue" in the question and in
// every other option, because the phrase was matched against every block.
//
// The scope is derived from the block's TEXT, not its position, so it still
// survives option shuffling (which is why substrings were chosen in the first
// place). Legacy rows hold a bare phrase with no separator; those keep the old
// apply-everywhere behaviour rather than silently vanishing.

export type HighlightMap = Map<string, string[]>   // questionId -> entries

// Unit Separator — will never occur in question text.
const SEP = '\u001f'

// Stable id for a block of text (djb2). Keyed on content, so it is unaffected
// by option order.
export function scopeOf(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = (((h << 5) + h) + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// The phrases that should be highlighted inside one block of text.
export function phrasesForScope(entries: string[], scope: string): string[] {
  const out: string[] = []
  for (const e of entries) {
    const i = e.indexOf(SEP)
    if (i === -1) out.push(e)                                  // legacy: applies everywhere
    else if (e.slice(0, i) === scope) out.push(e.slice(i + 1))
  }
  return out
}

export function addHighlightEntry(entries: string[], scope: string, phrase: string): string[] {
  return Array.from(new Set([...entries, scope + SEP + phrase]))
}

export function removeHighlightEntry(entries: string[], scope: string, phrase: string): string[] {
  const target = phrase.toLowerCase()
  return entries.filter(e => {
    const i = e.indexOf(SEP)
    if (i === -1) return e.toLowerCase() !== target            // legacy: clear it everywhere
    return !(e.slice(0, i) === scope && e.slice(i + 1).toLowerCase() === target)
  })
}

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

// Save the full entry list for one question (empty array clears it).
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
