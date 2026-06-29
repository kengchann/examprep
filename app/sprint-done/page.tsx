'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSprintStatus } from '@/lib/sprint'
import type { AttemptResult } from '@/lib/types'

// Calm end-of-sprint recap. Rewards consistency (streak first), keeps stats tiny.
// All data is local/derived — no AI.
function SprintDoneContent() {
  const router = useRouter()
  const params = useSearchParams()
  const elapsed = parseInt(params.get('elapsed') || '0')

  const [results, setResults] = useState<AttemptResult[]>([])
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('examprep_results')
      if (raw) setResults(JSON.parse(raw))
    } catch {}
    getSprintStatus().then(s => setStreak(s.streak)).catch(() => setStreak(null))
  }, [])

  const total = results.length
  const correct = results.filter(r => r.correct).length

  // Weakest topic among what was just answered (lowest accuracy, ties → most-missed).
  const byTopic: Record<string, { c: number; t: number }> = {}
  results.forEach(r => {
    const k = r.topic || 'General'
    byTopic[k] = byTopic[k] || { c: 0, t: 0 }
    byTopic[k].t++
    if (r.correct) byTopic[k].c++
  })
  const weakest = Object.entries(byTopic)
    .filter(([, v]) => v.c < v.t)
    .sort((a, b) => (a[1].c / a[1].t) - (b[1].c / b[1].t) || (b[1].t - b[1].c) - (a[1].t - a[1].c))[0]?.[0]

  const pct = total ? Math.round((correct / total) * 100) : 0
  const praise = pct >= 80 ? 'Sharp work today. 🎯'
    : pct >= 50 ? 'Solid progress — keep stacking days. 💪'
    : 'Every miss is a lesson. Showing up is the win. 🌱'

  const mins = Math.max(1, Math.round(elapsed / 60))

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col">
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-white">Sprint complete!</h1>
        <p className="text-brand-200 text-sm mt-1">{praise}</p>
      </div>

      <div className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 pb-10">
        {/* Streak — the headline reward */}
        <div className="card text-center mb-4">
          <div className="text-4xl mb-1">🔥</div>
          <p className="text-2xl font-bold text-gray-900">
            {streak === null ? '…' : `${streak}-day streak`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {streak && streak > 1 ? 'Come back tomorrow to keep it alive.' : 'Come back tomorrow to start a streak.'}
          </p>
        </div>

        {/* Tiny stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-green-600">{correct}/{total}</p>
            <p className="text-xs text-gray-400">Correct</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-gray-700">~{mins} min</p>
            <p className="text-xs text-gray-400">Focused</p>
          </div>
        </div>

        {/* One thing to revisit */}
        {weakest && (
          <div className="card bg-amber-50 border-amber-200 mb-4">
            <p className="text-xs font-semibold text-amber-700">📌 Revisit next time</p>
            <p className="text-sm text-amber-900 mt-0.5">{weakest}</p>
          </div>
        )}

        <button onClick={() => router.push('/dashboard')} className="btn-primary">
          Done
        </button>
        {total > 0 && (
          <button
            onClick={() => router.push(`/results?bankName=Daily%20Sprint&mode=learning&elapsed=${elapsed}`)}
            className="w-full text-sm text-gray-500 py-3 active:scale-95">
            Review answers →
          </button>
        )}
      </div>
    </div>
  )
}

export default function SprintDonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>}>
      <SprintDoneContent />
    </Suspense>
  )
}
