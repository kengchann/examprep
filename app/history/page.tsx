'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type Attempt = {
  id: string; bankId: string; bankName: string; mode: string
  date: string; score: number; correct: number; total: number; elapsed: number
}

const modeIcon: Record<string, string> = { practice: '⏱️', learning: '📖', custom: '⚙️' }
const modeLabel: Record<string, string> = { practice: 'Practice', learning: 'Learning', custom: 'Custom' }

export default function HistoryPage() {
  const [history, setHistory] = useState<Attempt[]>([])
  const router = useRouter()

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem('examprep_history') || '[]')
    setHistory(h)
  }, [])

  function clearHistory() {
    if (!confirm('Clear all exam history?')) return
    localStorage.removeItem('examprep_history')
    setHistory([])
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const avgScore = history.length > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) : 0
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Exam History</h1>
        <p className="text-brand-200 text-sm mt-0.5">Your past attempts</p>
      </div>

      <div className="px-4 pt-4">
        {history.length > 0 && (
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
              {history.map((attempt) => (
                <div key={attempt.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{modeIcon[attempt.mode] || '📋'}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">{attempt.bankName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{modeLabel[attempt.mode]}</span>
                        <span>·</span>
                        <span>{attempt.correct}/{attempt.total} correct</span>
                        <span>·</span>
                        <span>{formatTime(attempt.elapsed)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(attempt.date)}</p>
                    </div>
                    <div className={`text-lg font-bold flex-shrink-0 ${attempt.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                      {attempt.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={clearHistory} className="w-full text-red-400 text-sm py-2 border border-red-200 rounded-xl active:scale-95">
              Clear history
            </button>
          </>
        )}

        {history.length === 0 && (
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
