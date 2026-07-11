'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useUserRole } from '@/lib/useUserRole'
import { useDesign } from '@/lib/design'
import { fetchLatestSession, writeSession, clearSession, clearCloudSession } from '@/lib/session'
import { setDeck } from '@/lib/deck'
import { buildSprintDeck, computeWeakTopics } from '@/lib/weakAreas'
import { getSprintStatus, SPRINT_BANK_NAME, SPRINT_SIZE } from '@/lib/sprint'
import { computeDashStats, type DashStats } from '@/lib/gamification'
import type { QuestionBank, ExamMode } from '@/lib/types'
import {
  LayoutDashboard, GraduationCap, Sparkles, History as HistoryIcon, BarChart3, Settings as SettingsIcon,
  Library, PencilLine, Users, Search, LogOut, LayoutTemplate,
} from 'lucide-react'

// ============================================================================
// MODERN dashboard — premium dark SaaS variant (design toggle: ui-design).
// Same data, same actions, same backend as the classic dashboard; only the
// presentation layer differs. Classic remains untouched in app/dashboard.
// ============================================================================

const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', Icon: GraduationCap },
  { href: '/study', label: 'Study Tools', Icon: Sparkles },
  { href: '/history', label: 'History', Icon: HistoryIcon },
  { href: '/learn/mastery', label: 'Analytics', Icon: BarChart3 },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]
const ADMIN_NAV = [
  { href: '/admin/banks', label: 'Banks', Icon: Library },
  { href: '/admin/questions', label: 'Questions', Icon: PencilLine },
  { href: '/admin/students', label: 'Students', Icon: Users },
]

const MODES: { id: ExamMode; label: string; icon: string; desc: string }[] = [
  { id: 'practice', label: 'Practice Exam', icon: '⏱', desc: 'Timed, real exam feel' },
  { id: 'learning', label: 'Learning Mode', icon: '📖', desc: 'See answers instantly' },
  { id: 'custom', label: 'Custom Mode', icon: '⚙', desc: 'Pick questions & time' },
]

const fmtMin = (s: number) => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : `${Math.round(s / 60)}m`

// --- tiny SVG charts (no chart library needed) ------------------------------

function LineChart({ points, height = 120, color = 'rgb(var(--m-primary))' }: { points: number[]; height?: number; color?: string }) {
  const w = 300, h = height, pad = 8
  const max = Math.max(...points, 1)
  const step = (w - pad * 2) / Math.max(points.length - 1, 1)
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2)
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${pad + i * step},${y(v)}`).join(' ')
  const area = `${path} L${pad + (points.length - 1) * step},${h - pad} L${pad},${h - pad} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={y(v)} r="3" style={{ fill: 'rgb(var(--m-card))' }} stroke={color} strokeWidth="2" />
      ))}
    </svg>
  )
}

function Ring({ pct, size = 110, stroke = 8, color = 'rgb(var(--m-secondary))', label, sub }: {
  pct: number; size?: number; stroke?: number; color?: string; label: string; sub?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--m-soft2)' }} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(pct, 1))} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-m-text font-bold text-lg leading-none">{label}</span>
        {sub && <span className="text-[10px] text-m-muted mt-0.5">{sub}</span>}
      </div>
    </div>
  )
}

// Original decorative mountain artwork for the sprint hero (inline SVG, no assets).
function Mountains() {
  return (
    <svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 w-full h-28 opacity-60 pointer-events-none">
      <path d="M0 140 L70 55 L120 100 L180 30 L250 110 L310 60 L400 140 Z" style={{ fill: 'var(--m-art1)' }} />
      <path d="M0 140 L100 85 L170 120 L240 70 L320 125 L400 90 L400 140 Z" style={{ fill: 'var(--m-art2)' }} />
    </svg>
  )
}

// --- KPI card ---------------------------------------------------------------

function Kpi({ icon, label, value, trend, trendGood, bar }: {
  icon: string; label: string; value: string; trend?: string; trendGood?: boolean; bar?: number
}) {
  return (
    <div className="bg-m-card border border-m-line rounded-2xl p-4 hover:border-m-line2 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-m-muted font-medium">{label}</p>
        <span className="text-base opacity-80">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-m-text leading-none">{value}</p>
      {trend && (
        <p className={`text-[11px] mt-1.5 font-medium ${trendGood ? 'text-green-600 dark:text-green-400' : 'text-m-muted'}`}>{trend}</p>
      )}
      {bar !== undefined && (
        <div className="h-1.5 bg-m-soft2 rounded-full overflow-hidden mt-2">
          <div className="h-full rounded-full bg-m-primary transition-all duration-700" style={{ width: `${Math.min(bar, 1) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

// ============================================================================

export default function ModernDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin, isTrial } = useUserRole()
  const { setDesign } = useDesign()

  const [userName, setUserName] = useState('')
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashStats | null>(null)
  const [sprint, setSprint] = useState<{ streak: number; doneToday: boolean } | null>(null)
  const [focusTopics, setFocusTopics] = useState<string[]>([])
  const [sprintBuilding, setSprintBuilding] = useState(false)
  const [search, setSearch] = useState('')
  const [modeFor, setModeFor] = useState<QuestionBank | null>(null)
  const [resume, setResume] = useState<{ bankId: string; bankName: string; mode: ExamMode } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'there')
      supabase.rpc('touch_last_active')

      const [banksRes, countsRes, s, sp, topics] = await Promise.all([
        supabase.from('question_banks').select('*').order('created_at', { ascending: false }),
        supabase.from('questions').select('bank_id'),
        computeDashStats(),
        getSprintStatus().catch(() => ({ streak: 0, doneToday: false })),
        computeWeakTopics().catch(() => []),
      ])
      const countMap: Record<string, number> = {}
      for (const row of countsRes.data ?? []) countMap[row.bank_id] = (countMap[row.bank_id] ?? 0) + 1
      setBanks((banksRes.data || []).map(b => ({ ...b, question_count: countMap[b.id] ?? 0 })))
      setStats(s)
      setSprint(sp)
      setFocusTopics(topics.filter(t => t.weakness > 0.001).slice(0, 4).map(t => t.topic))
      setLoading(false)
    }
    load()
    const heartbeat = setInterval(() => supabase.rpc('touch_last_active'), 60000)
    return () => clearInterval(heartbeat)
  }, [])

  // Poll for a resumable session (this device or another) so one paused on
  // your phone appears here within a few seconds — no manual refresh needed.
  useEffect(() => {
    let cancelled = false
    async function checkResume() {
      const saved = await fetchLatestSession()
      if (cancelled) return
      if (!saved) { setResume(null); return }
      writeSession(saved.meta, saved.state)
      setResume({ bankId: saved.meta.bankId, bankName: saved.meta.bankName, mode: saved.meta.mode })
    }
    checkResume()
    const iv = setInterval(checkResume, 5000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  async function startSprint() {
    setSprintBuilding(true)
    const deck = await buildSprintDeck(SPRINT_SIZE)
    setSprintBuilding(false)
    if (deck.length === 0) { alert('No questions available for a sprint yet.'); return }
    setDeck(deck)
    router.push(`/exam?${new URLSearchParams({ mode: 'learning', deck: '1', sprint: '1', bankName: SPRINT_BANK_NAME })}`)
  }

  function startExam(bank: QuestionBank, mode: ExamMode) {
    router.push(`/exam?${new URLSearchParams({ bank: bank.id, bankName: bank.name, mode })}`)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const filteredBanks = useMemo(
    () => banks.filter(b => b.name.toLowerCase().includes(search.trim().toLowerCase())),
    [banks, search]
  )

  const accDelta = stats ? Math.round((stats.accuracyRecent - stats.accuracyPrev) * 100) : 0
  const qDelta = stats ? stats.questionsToday - stats.questionsYesterday : 0

  return (
    <div className="min-h-screen bg-m-bg text-m-text lg:pl-60" style={{ fontFamily: 'var(--font-inter), ui-sans-serif, system-ui' }}>

      {/* ============ SIDEBAR (desktop) ============ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-m-surface border-r border-m-line z-40">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-m-line">
          <span className="w-8 h-8 rounded-xl bg-m-primary flex items-center justify-center text-base">📋</span>
          <span className="font-bold tracking-tight">ExamPrep</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                href === '/dashboard' ? 'bg-m-primary/20 text-m-text' : 'text-m-muted hover:text-m-text hover:bg-m-soft'
              }`}>
              <Icon size={17} strokeWidth={2} />{label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-m-muted/70">Admin</p>
              {ADMIN_NAV.map(({ href, label, Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-m-muted hover:text-m-text hover:bg-m-soft transition-colors">
                  <Icon size={17} strokeWidth={2} />{label}
                </Link>
              ))}
            </>
          )}
        </nav>
        {/* User card */}
        {stats && (
          <div className="m-3 p-3 rounded-2xl bg-m-card border border-m-line">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-full bg-m-primary flex items-center justify-center font-bold text-sm uppercase">
                {userName.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{userName} {isAdmin && <span className="text-[10px] bg-m-primary/25 text-m-secondary px-1.5 py-0.5 rounded-full ml-1">Admin</span>}</p>
                <p className="text-[11px] text-m-muted">Level {stats.level} · {stats.xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="h-1.5 bg-m-soft2 rounded-full overflow-hidden">
              <div className="h-full bg-m-primary rounded-full transition-all duration-700" style={{ width: `${stats.levelProgress * 100}%` }} />
            </div>
          </div>
        )}
      </aside>

      {/* ============ TOP BAR ============ */}
      <header className="sticky top-0 z-30 bg-m-bg/80 backdrop-blur-md border-b border-m-line">
        <div className="flex items-center gap-3 px-4 lg:px-8 h-16 max-w-7xl">
          <span className="lg:hidden w-8 h-8 rounded-xl bg-m-primary flex items-center justify-center">📋</span>
          <div className="flex-1 max-w-md relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search question banks…"
              className="w-full bg-m-surface border border-m-line rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-m-muted/60 focus:outline-none focus:ring-2 focus:ring-m-primary/50"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-m-muted" />
          </div>
          <button onClick={() => setDesign('classic')}
            title="Switch to Classic design"
            className="flex items-center gap-1.5 text-xs font-medium text-m-muted border border-m-line rounded-lg px-2.5 py-1.5 hover:text-m-text hover:border-m-line2 transition-colors whitespace-nowrap">
            <LayoutTemplate size={13} /> Classic
          </button>
          <button onClick={signOut}
            className="flex items-center gap-1.5 text-xs font-medium text-m-muted border border-m-line rounded-lg px-2.5 py-1.5 hover:text-m-text hover:border-m-line2 transition-colors">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      {/* ============ CONTENT ============ */}
      <main className="px-4 lg:px-8 py-6 max-w-7xl pb-28 lg:pb-10 space-y-6">

        {/* Hero */}
        <div className="animate-fade-up">
          <p className="text-sm text-m-muted">Welcome back,</p>
          <h1 className="text-3xl font-bold tracking-tight">{userName} 👋</h1>
          <p className="text-sm text-m-muted mt-1">Keep learning, stay consistent, and ace your certification.</p>
        </div>

        {/* Trial notice */}
        {isTrial && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-700 dark:text-amber-200 animate-fade-up">
            🎁 Free trial — you can preview the first 20 questions of each bank. Ask your admin to unlock everything.
          </div>
        )}

        {/* Resume */}
        {resume && (
          <div className="bg-m-card border border-m-primary/40 rounded-2xl p-4 flex items-center gap-3 animate-fade-up">
            <span className="text-2xl">⏸</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Resume your exam</p>
              <p className="text-xs text-m-muted truncate">{resume.bankName}</p>
            </div>
            <button
              onClick={() => router.push(`/exam?${new URLSearchParams({ bank: resume.bankId, bankName: resume.bankName, mode: resume.mode, resume: '1' })}`)}
              className="bg-m-primary hover:bg-m-primaryHover text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              Resume
            </button>
            <button onClick={() => { if (confirm('Discard your in-progress exam?')) { clearSession(); clearCloudSession().catch(() => {}); setResume(null) } }}
              className="text-m-muted text-sm px-2 hover:text-m-text">✕</button>
          </div>
        )}

        {/* KPI row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-m-card animate-pulse" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-up">
            <Kpi icon="🎯" label="Daily Goal" value={`${Math.min(stats.questionsToday, stats.dailyGoal)} / ${stats.dailyGoal}`}
              bar={stats.questionsToday / stats.dailyGoal}
              trend={stats.questionsToday >= stats.dailyGoal ? 'Goal reached! 🎉' : `${Math.round(Math.min(stats.questionsToday / stats.dailyGoal, 1) * 100)}%`}
              trendGood={stats.questionsToday >= stats.dailyGoal} />
            <Kpi icon="🗂" label="Questions Today" value={String(stats.questionsToday)}
              trend={qDelta === 0 ? 'same as yesterday' : `${qDelta > 0 ? '▲' : '▼'} ${Math.abs(qDelta)} vs yesterday`}
              trendGood={qDelta > 0} />
            <Kpi icon="◎" label="Accuracy (7d)" value={`${Math.round(stats.accuracyRecent * 100)}%`}
              trend={accDelta === 0 ? 'steady' : `${accDelta > 0 ? '▲' : '▼'} ${Math.abs(accDelta)}% vs last week`}
              trendGood={accDelta >= 0} />
            <Kpi icon="🔥" label="Study Streak" value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
              trend={stats.streak > 0 ? 'Keep it up!' : 'Start today'} trendGood={stats.streak > 0} />
            <Kpi icon="⭐" label="XP Earned" value={stats.xp.toLocaleString()}
              trend={stats.xpToday > 0 ? `▲ ${stats.xpToday} today` : 'none today'} trendGood={stats.xpToday > 0} />
          </div>
        )}

        {/* Sprint + Weekly chart */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Sprint hero */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-m-line m-hero p-6 animate-fade-up">
            <Mountains />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <h2 className="text-xl font-bold">Today&apos;s Sprint</h2>
                <p className="text-sm text-m-muted mt-1">{SPRINT_SIZE} questions · ~5 min · focuses your weak spots</p>
                {focusTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {focusTopics.map(t => (
                      <span key={t} className="text-[11px] font-medium bg-m-soft2 border border-m-line rounded-full px-2.5 py-1">{t}</span>
                    ))}
                  </div>
                )}
                <button onClick={startSprint} disabled={sprintBuilding}
                  className="mt-5 bg-m-primary hover:bg-m-primaryHover disabled:opacity-60 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all active:scale-95">
                  {sprintBuilding ? 'Building…' : sprint?.doneToday ? 'Bonus sprint →' : 'Start Sprint →'}
                </button>
              </div>
              <Ring
                pct={sprint?.doneToday ? 1 : 0}
                label={sprint?.doneToday ? 'Done' : '0%'}
                sub={sprint?.doneToday ? 'today ✓' : 'Progress'}
              />
            </div>
          </div>

          {/* Weekly progress */}
          <div className="bg-m-card border border-m-line rounded-3xl p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Weekly Progress</h3>
              <span className="text-[11px] text-m-muted">questions / day</span>
            </div>
            {stats && (
              <>
                <LineChart points={stats.week.map(d => d.questions)} />
                <div className="flex justify-between text-[10px] text-m-muted mt-1 px-1">
                  {stats.week.map((d, i) => <span key={i}>{d.label}</span>)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Question banks */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Question Banks</h2>
            {isAdmin && <Link href="/admin/banks" className="text-xs text-m-secondary hover:text-m-text">Manage →</Link>}
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-m-card animate-pulse" />)}
            </div>
          ) : filteredBanks.length === 0 ? (
            <div className="bg-m-card border border-m-line rounded-2xl p-8 text-center text-m-muted text-sm">
              {search ? 'No banks match your search.' : 'No exam banks available yet.'}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredBanks.map(bank => {
                const info = stats?.perBank[bank.id]
                const pct = bank.question_count > 0 && info ? Math.min(info.seen.size / bank.question_count, 1) : 0
                return (
                  <div key={bank.id} className="bg-m-card border border-m-line rounded-2xl p-4 hover:border-m-primary/50 hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-m-primary/15 flex items-center justify-center text-lg flex-shrink-0">
                        {bank.category === 'IT' ? '💻' : bank.category === 'Academic' ? '📖' : '📝'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{bank.name}</p>
                        <p className="text-[11px] text-m-muted">{bank.question_count} questions · {bank.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-m-muted mb-1">
                      <span>Progress</span><span>{Math.round(pct * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-m-soft2 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-m-primary rounded-full transition-all duration-700" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-m-muted">
                        {info ? `Last studied ${new Date(info.last).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Not started'}
                      </span>
                      <button onClick={() => setModeFor(bank)}
                        className="text-xs font-semibold text-m-secondary border border-m-primary/40 rounded-lg px-3 py-1.5 hover:bg-m-primary hover:text-white transition-colors active:scale-95">
                        {info ? 'Continue →' : 'Start →'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Analytics + Achievements */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Analytics */}
          <section className="bg-m-card border border-m-line rounded-3xl p-5 animate-fade-up">
            <h2 className="font-semibold text-sm mb-4">Analytics Overview</h2>
            {stats && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-m-muted">Accuracy trend (7 days)</p>
                    <p className="text-xs font-semibold text-m-secondary">{Math.round(stats.accuracyRecent * 100)}% avg</p>
                  </div>
                  <LineChart points={stats.week.map(d => Math.round(d.accuracy * 100))} height={90} color="#22C55E" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-m-soft rounded-xl py-3">
                    <p className="text-lg font-bold">{fmtMin(stats.studyTimeWeek)}</p>
                    <p className="text-[11px] text-m-muted">Study time (7d)</p>
                  </div>
                  <div className="bg-m-soft rounded-xl py-3">
                    <p className="text-lg font-bold">{stats.week.reduce((s, d) => s + d.questions, 0)}</p>
                    <p className="text-[11px] text-m-muted">Questions (7d)</p>
                  </div>
                </div>
                <Link href="/learn/mastery" className="block text-center text-xs text-m-secondary hover:text-m-text mt-4">
                  Full mastery breakdown →
                </Link>
              </>
            )}
          </section>

          {/* Achievements */}
          <section className="bg-m-card border border-m-line rounded-3xl p-5 animate-fade-up">
            <h2 className="font-semibold text-sm mb-4">Achievements</h2>
            <div className="grid grid-cols-3 gap-3">
              {(stats?.achievements ?? []).map(a => (
                <div key={a.id} title={a.desc}
                  className={`flex flex-col items-center text-center rounded-2xl border p-3 transition-all ${
                    a.unlocked ? 'border-m-primary/40 bg-m-primary/10' : 'border-m-line bg-m-soft opacity-40 grayscale'
                  }`}>
                  <span className="text-2xl mb-1">{a.icon}</span>
                  <p className="text-[11px] font-semibold leading-tight">{a.title}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ============ MOBILE BOTTOM NAV ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-m-surface/95 backdrop-blur-md border-t border-m-line flex">
        {[
          { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
          { href: '/learn', label: 'Learn', Icon: GraduationCap },
          { href: '/study', label: 'Study', Icon: Sparkles },
          { href: '/history', label: 'History', Icon: HistoryIcon },
          { href: '/settings', label: 'Settings', Icon: SettingsIcon },
        ].map(({ href, label, Icon }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-medium ${
              href === '/dashboard' ? 'text-m-secondary' : 'text-m-muted'
            }`}>
            <Icon size={20} strokeWidth={href === '/dashboard' ? 2.4 : 2} />{label}
          </Link>
        ))}
      </nav>

      {/* ============ MODE PICKER MODAL ============ */}
      {modeFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setModeFor(null)}>
          <div className="bg-m-surface border border-m-line rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-5 animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{modeFor.name}</h3>
                <p className="text-xs text-m-muted">{modeFor.question_count} questions · choose a mode</p>
              </div>
              <button onClick={() => setModeFor(null)} className="text-m-muted text-2xl leading-none hover:text-m-text">×</button>
            </div>
            <div className="space-y-2">
              {MODES.map(m => (
                <button key={m.id} onClick={() => startExam(modeFor, m.id)}
                  className="w-full flex items-center gap-3 bg-m-card border border-m-line hover:border-m-primary/50 rounded-2xl p-4 text-left transition-colors active:scale-[0.98]">
                  <span className="text-xl">{m.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-[11px] text-m-muted">{m.desc}</p>
                  </div>
                  <span className="ml-auto text-m-secondary">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
