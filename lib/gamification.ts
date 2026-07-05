import { createClient } from './supabase'
import type { AttemptResult } from './types'

// Dashboard gamification stats — XP, level, streaks, daily counts, weekly
// trend, achievements. Everything is DERIVED client-side from the existing
// attempts table; no new schema, no writes.

export type DayPoint = { label: string; questions: number; accuracy: number }

export type Achievement = {
  id: string
  icon: string
  title: string
  desc: string
  unlocked: boolean
}

export type DashStats = {
  xp: number
  level: number
  levelProgress: number        // 0..1 toward next level
  xpToday: number
  streak: number               // consecutive days with any completed attempt
  questionsToday: number
  questionsYesterday: number
  accuracyRecent: number       // 0..1 over last 7 days
  accuracyPrev: number         // 0..1 over the 7 days before that
  dailyGoal: number
  studyTimeWeek: number        // seconds studied in the last 7 days
  week: DayPoint[]             // last 7 days, oldest first
  achievements: Achievement[]
  perBank: Record<string, { seen: Set<string>; last: string }>   // bank_id -> distinct qids + last studied
}

const DAILY_GOAL = 20
const DAY = 86_400_000

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// Level curve: each level needs progressively more XP (level n starts at 100·n·(n-1)/2).
function levelFromXp(xp: number): { level: number; progress: number } {
  let level = 1
  let floor = 0
  while (xp >= floor + level * 100) { floor += level * 100; level++ }
  return { level, progress: (xp - floor) / (level * 100) }
}

export async function computeDashStats(): Promise<DashStats | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('attempts')
    .select('bank_id, bank_name, score, correct, total, elapsed_seconds, created_at, details')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(300)

  type Row = { bank_id: string | null; bank_name: string; score: number; correct: number; total: number; elapsed_seconds: number | null; created_at: string; details: AttemptResult[] | null }
  const rows = (data ?? []) as Row[]

  // --- XP: 10 per correct answer + 25 per completed attempt ---
  let xp = 0, xpToday = 0
  const todayKey = dayKey(new Date())
  for (const r of rows) {
    const gained = (r.correct ?? 0) * 10 + 25
    xp += gained
    if (dayKey(new Date(r.created_at)) === todayKey) xpToday += gained
  }
  const { level, progress } = levelFromXp(xp)

  // --- Activity streak (any completed attempt counts; today optional) ---
  const days = new Set(rows.map(r => dayKey(new Date(r.created_at))))
  let streak = 0
  const cursor = new Date()
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }

  // --- Daily counts + 7-day trend ---
  const perDay = new Map<string, { q: number; c: number }>()
  for (const r of rows) {
    const k = dayKey(new Date(r.created_at))
    const d = perDay.get(k) ?? { q: 0, c: 0 }
    d.q += r.total ?? 0
    d.c += r.correct ?? 0
    perDay.set(k, d)
  }
  const week: DayPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY)
    const v = perDay.get(dayKey(d)) ?? { q: 0, c: 0 }
    week.push({
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      questions: v.q,
      accuracy: v.q > 0 ? v.c / v.q : 0,
    })
  }
  const questionsToday = perDay.get(todayKey)?.q ?? 0
  const yKey = dayKey(new Date(Date.now() - DAY))
  const questionsYesterday = perDay.get(yKey)?.q ?? 0

  // --- Accuracy: last 7 days vs the 7 before ---
  const now = Date.now()
  let rq = 0, rc = 0, pq = 0, pc = 0
  for (const r of rows) {
    const age = now - new Date(r.created_at).getTime()
    if (age <= 7 * DAY) { rq += r.total ?? 0; rc += r.correct ?? 0 }
    else if (age <= 14 * DAY) { pq += r.total ?? 0; pc += r.correct ?? 0 }
  }
  const accuracyRecent = rq > 0 ? rc / rq : 0
  const accuracyPrev = pq > 0 ? pc / pq : 0

  // --- Study time, last 7 days (seconds) ---
  const studyTimeWeek = rows
    .filter(r => now - new Date(r.created_at).getTime() <= 7 * DAY)
    .reduce((s, r) => s + (r.elapsed_seconds ?? 0), 0)

  // --- Per-bank progress (distinct questions answered per bank) ---
  const perBank: DashStats['perBank'] = {}
  for (const r of rows) {
    if (!r.bank_id) continue
    let b = perBank[r.bank_id]
    if (!b) { b = { seen: new Set(), last: r.created_at }; perBank[r.bank_id] = b }
    if (r.created_at > b.last) b.last = r.created_at
    for (const q of r.details ?? []) b.seen.add(q.questionId)
  }

  // --- Achievements (derived, unlock thresholds) ---
  const totalAnswered = rows.reduce((s, r) => s + (r.total ?? 0), 0)
  const totalCorrect = rows.reduce((s, r) => s + (r.correct ?? 0), 0)
  const sharpshooter = rows.some(r => (r.total ?? 0) >= 10 && (r.score ?? 0) >= 90)
  const sprints = rows.filter(r => r.bank_name === 'Daily Sprint').length
  const achievements: Achievement[] = [
    { id: 'streak7', icon: '🔥', title: '7-Day Streak', desc: 'Study 7 days in a row', unlocked: streak >= 7 },
    { id: 'q100', icon: '💯', title: '100 Questions', desc: 'Answer 100 questions', unlocked: totalAnswered >= 100 },
    { id: 'sharp', icon: '🎯', title: 'Sharpshooter', desc: 'Score 90%+ on a 10+ question exam', unlocked: sharpshooter },
    { id: 'sprinter', icon: '⚡', title: 'Sprinter', desc: 'Complete 5 Daily Sprints', unlocked: sprints >= 5 },
    { id: 'correct500', icon: '🏆', title: 'Half-K Club', desc: 'Get 500 answers right', unlocked: totalCorrect >= 500 },
    { id: 'level5', icon: '⭐', title: 'Level 5', desc: 'Reach level 5', unlocked: level >= 5 },
  ]

  return {
    xp, level, levelProgress: progress, xpToday,
    streak, questionsToday, questionsYesterday,
    accuracyRecent, accuracyPrev,
    dailyGoal: DAILY_GOAL, studyTimeWeek, week, achievements, perBank,
  }
}
