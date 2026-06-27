'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Attempt } from '@/lib/types'

const modeIcon: Record<string, string> = { practice: '⏱️', learning: '📖', custom: '⚙️' }
const modeLabel: Record<string, string> = { practice: 'Practice', learning: 'Learning', custom: 'Custom' }

export default function HistoryPage() {
  const [history, setHistory] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      setHistory((data as Attempt[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  // Open the full review of a past attempt by reusing the results screen.
  function review(a: Attempt) {
    if (!a.details || a.details.length === 0) return
    sessionStorage.setItem('examprep_results', JSON.stringify(a.details))
    const params = new URLSearchParams({
      bankName: a.bank_name || 'Exam',
      mode: a.mode || 'practice',
      elapsed: String(a.elapsed_seconds ?? 0),
    })
    router.push(`/results?${params}`)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const avgScore = history.length > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Exam History</h1>
        <p className="text-brand-200 text-sm mt-0.5">Saved to your account · tap to review</p>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}</div>
        ) : history.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="card text-center py-2">
                <div className="text-xl font-bold text-brand-600">{history.length}</div>
                <div className="text-xs text-gray-400">Attempts</div>
              </div>
              <div className="card text-center py-2">
                <div className="text-xl font-bold text-blue-600">{avgScore}%</div>
                <div className="text-xs text-gray-400">Average</div>
              </div>
              <div className="card text-center py-2">
                <div className="text-xl font-bold text-green-600">{bestScore}%</div>
                <div className="text-xs text-gray-400">Best</div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {history.map((attempt) => {
                const reviewable = !!attempt.details && attempt.details.length > 0
                return (
                  <button key={attempt.id} onClick={() => review(attempt)} disabled={!reviewable}
                    className={`card w-full text-left ${reviewable ? 'active:scale-[0.98] transition-transform' : 'opacity-90 cursor-default'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{modeIcon[attempt.mode] || '📋'}</span>
                          <span className="text-sm font-semibold text-gray-900 truncate">{attempt.bank_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{modeLabel[attempt.mode] || attempt.mode}</span>
                          <span>·</span>
                          <span>{attempt.correct}/{attempt.total} correct</span>
                          <span>·</span>
                          <span>{formatTime(attempt.elapsed_seconds)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(attempt.created_at)}
                          {reviewable
                            ? <span className="text-brand-600 font-medium"> · Review →</span>
                            : <span className="text-gray-300"> · no detail saved</span>}
                        </p>
                      </div>
                      <div className={`text-lg font-bold flex-shrink-0 ${attempt.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                        {attempt.score}%
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium text-gray-700">No attempts yet</p>
            <p className="text-sm text-gray-400 mt-1">Complete an exam to see your history here</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">
              Start an exam
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
