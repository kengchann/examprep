import { createClient } from './supabase'

// Daily Sprint — a calm, one-tap 7-question session. It reuses the exam runner
// (launched as a learning-mode deck) and stores attempts under this bank name so
// streaks can be derived from existing data — no new tables.

export const SPRINT_BANK_NAME = 'Daily Sprint'
export const SPRINT_SIZE = 7

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`   // local-time day
}

// Streak = consecutive days (up to today, or yesterday if today isn't done yet)
// that have at least one completed sprint. doneToday flips the Home card.
export async function getSprintStatus(): Promise<{ streak: number; doneToday: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { streak: 0, doneToday: false }

  const { data } = await supabase
    .from('attempts')
    .select('created_at')
    .eq('user_id', user.id)
    .eq('bank_name', SPRINT_BANK_NAME)
    .order('created_at', { ascending: false })
    .limit(200)

  const days = new Set<string>()
  for (const r of (data ?? []) as { created_at: string }[]) days.add(dayKey(new Date(r.created_at)))

  const doneToday = days.has(dayKey(new Date()))
  let streak = 0
  const d = new Date()
  if (!doneToday) d.setDate(d.getDate() - 1)   // a not-yet-done today doesn't break the streak
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1) }

  return { streak, doneToday }
}
