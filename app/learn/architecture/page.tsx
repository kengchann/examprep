'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARCH_SCENARIOS } from '@/lib/architecture'

// Architecture Spotter — "which service completes/fixes this design?" Trains
// architecture thinking with static MCQs. No AI.
export default function ArchitecturePage() {
  const router = useRouter()
  const items = useMemo(() => [...ARCH_SCENARIOS].sort(() => Math.random() - 0.5), [])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const item = items[i]

  function pick(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    if (idx === item.answer) setScore(s => s + 1)
  }
  function next() {
    if (i + 1 >= items.length) { setDone(true); return }
    setI(i + 1); setPicked(null)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-brand-600 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-3">🏗️</div>
        <h1 className="text-2xl font-bold text-white">{score}/{items.length}</h1>
        <p className="text-brand-200 text-sm mt-1 mb-8">Architecture instincts sharpening 💪</p>
        <button onClick={() => { setI(0); setScore(0); setPicked(null); setDone(false) }}
          className="w-full max-w-xs bg-white text-brand-600 font-bold py-3 rounded-2xl active:scale-95 mb-3">Again</button>
        <button onClick={() => router.push('/learn')} className="w-full max-w-xs border border-white/40 text-white font-medium py-3 rounded-2xl active:scale-95">Back to Learn</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10 flex items-center justify-between">
        <button onClick={() => router.push('/learn')} className="text-gray-400 text-sm active:scale-95">← Exit</button>
        <span className="text-sm font-medium text-gray-500">{i + 1} of {items.length}</span>
        <span className="text-sm font-bold text-amber-500">🏗️ {score}</span>
      </div>

      <div className="flex-1 px-4 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Complete the architecture</p>
        <div className="card mb-3">
          <p className="text-base text-gray-900 leading-relaxed">{item.scenario}</p>
        </div>
        <div className="space-y-2">
          {item.options.map((opt, idx) => {
            const isAnswer = idx === item.answer
            const isPicked = picked === idx
            let cls = 'border-gray-200 bg-white text-gray-800'
            if (picked !== null) {
              if (isAnswer) cls = 'border-green-500 bg-green-50 text-green-800'
              else if (isPicked) cls = 'border-red-400 bg-red-50 text-red-700'
              else cls = 'border-gray-100 bg-gray-50 text-gray-400'
            }
            return (
              <button key={idx} onClick={() => pick(idx)} disabled={picked !== null}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 font-medium transition-all active:scale-[0.98] ${cls}`}>
                {opt}
              </button>
            )
          })}
        </div>
        {picked !== null && (
          <>
            <div className="card bg-blue-50 border-blue-100 mt-3">
              <p className="text-xs font-semibold text-blue-600 mb-0.5">Why</p>
              <p className="text-sm text-blue-800">{item.why}</p>
            </div>
            <button onClick={next} className="btn-primary mt-3">
              {i + 1 >= items.length ? 'See result →' : 'Next →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
