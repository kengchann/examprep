'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { computeWeakTopics, type TopicStat } from '@/lib/weakAreas'
import BottomNav from '@/components/BottomNav'

// Mastery map — one honest signal per topic (🔴🟡🟢), derived from attempts.
// No AI, no new data.
export default function MasteryPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicStat[] | null>(null)

  useEffect(() => { computeWeakTopics().then(setTopics).catch(() => setTopics([])) }, [])

  const dot = (acc: number) => acc >= 0.85 ? '🟢' : acc >= 0.6 ? '🟡' : '🔴'
  const bar = (acc: number) => acc >= 0.85 ? 'bg-green-500' : acc >= 0.6 ? 'bg-amber-400' : 'bg-red-400'

  // Strongest first reads as a progress board.
  const sorted = topics ? [...topics].sort((a, b) => b.accuracy - a.accuracy) : []

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">📊 Mastery</h1>
        <p className="text-brand-200 text-sm mt-0.5">Where you stand, by topic — based on your recent answers</p>
      </div>

      <div className="px-4 pt-5">
        {topics === null ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="card animate-pulse h-12 bg-gray-100" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-2">📈</p>
            <p className="font-medium text-gray-700">No mastery data yet</p>
            <p className="text-sm text-gray-400 mt-1">Answer some questions and your topic strengths appear here.</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4 text-sm">Back to Home</button>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map(t => {
              const pct = Math.round(t.accuracy * 100)
              return (
                <div key={t.topic} className="card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{dot(t.accuracy)} {t.topic}</span>
                    <span className="text-sm font-bold text-gray-700 ml-2">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar(t.accuracy)}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{t.seen} question{t.seen !== 1 ? 's' : ''} practiced</p>
                </div>
              )
            })}
            <p className="text-center text-xs text-gray-400 pt-2">🟢 strong · 🟡 getting there · 🔴 needs work</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
