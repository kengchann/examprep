'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { CONFUSIONS, type Confusion } from '@/lib/confusions'

// Confusion Trainer — pick a pair, study the one-line distinction, then drill
// "which fits this scenario?". Static content, no AI.
export default function ConfusionTrainerPage() {
  const router = useRouter()
  const [pair, setPair] = useState<Confusion | null>(null)

  if (!pair) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-brand-600 px-4 pt-12 pb-5">
          <h1 className="text-white text-xl font-bold">🧠 Confusion Trainer</h1>
          <p className="text-brand-200 text-sm mt-0.5">Stop mixing up similar services</p>
        </div>
        <div className="px-4 pt-5 space-y-2">
          {CONFUSIONS.map(c => (
            <button key={c.id} onClick={() => setPair(c)}
              className="w-full text-left card flex items-center gap-3 active:scale-[0.98]">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-400 truncate">{c.key}</p>
              </div>
              <span className="text-brand-600 text-lg">→</span>
            </button>
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  return <PairDrill pair={pair} onBack={() => setPair(null)} onExit={() => router.push('/learn')} />
}

function PairDrill({ pair, onBack, onExit }: { pair: Confusion; onBack: () => void; onExit: () => void }) {
  const [step, setStep] = useState(0)             // 0 = compare, then 1..N drills
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  const [score, setScore] = useState(0)

  const drillIndex = step - 1
  const drill = pair.drills[drillIndex]
  const onCompare = step === 0
  const finished = step > pair.drills.length

  function pick(choice: 'a' | 'b') {
    if (picked) return
    setPicked(choice)
    if (choice === drill.answer) setScore(s => s + 1)
  }
  function next() {
    setPicked(null)
    setStep(s => s + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10 flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 text-sm active:scale-95">← Pairs</button>
        <span className="text-sm font-semibold text-gray-700">{pair.title}</span>
        <button onClick={onExit} className="text-gray-400 text-sm active:scale-95">Exit</button>
      </div>

      <div className="flex-1 px-4 py-5">
        {onCompare && (
          <>
            <div className="grid grid-cols-1 gap-2 mb-3">
              <div className="card border-brand-100">
                <p className="font-bold text-brand-700 text-sm">{pair.a.name}</p>
                <p className="text-sm text-gray-700 mt-0.5">{pair.a.tagline}</p>
              </div>
              <div className="card border-purple-100">
                <p className="font-bold text-purple-700 text-sm">{pair.b.name}</p>
                <p className="text-sm text-gray-700 mt-0.5">{pair.b.tagline}</p>
              </div>
            </div>
            <div className="card bg-amber-50 border-amber-200 mb-4">
              <p className="text-xs font-semibold text-amber-700">🔑 The distinction</p>
              <p className="text-sm text-amber-900 mt-0.5">{pair.key}</p>
            </div>
            <button onClick={() => setStep(1)} className="btn-primary">Drill it ({pair.drills.length} scenarios) →</button>
          </>
        )}

        {!onCompare && !finished && (
          <>
            <p className="text-xs text-gray-400 mb-2">Scenario {drillIndex + 1} of {pair.drills.length}</p>
            <div className="card mb-3">
              <p className="text-base text-gray-900 leading-relaxed">{drill.scenario}</p>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-2">Which fits?</p>
            <div className="space-y-2">
              {(['a', 'b'] as const).map(opt => {
                const isAnswer = drill.answer === opt
                const isPicked = picked === opt
                let cls = 'border-gray-200 bg-white text-gray-800'
                if (picked) {
                  if (isAnswer) cls = 'border-green-500 bg-green-50 text-green-800'
                  else if (isPicked) cls = 'border-red-400 bg-red-50 text-red-700'
                  else cls = 'border-gray-100 bg-gray-50 text-gray-400'
                }
                return (
                  <button key={opt} onClick={() => pick(opt)} disabled={!!picked}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 font-medium transition-all active:scale-[0.98] ${cls}`}>
                    {pair[opt].name}
                  </button>
                )
              })}
            </div>
            {picked && (
              <>
                <div className="card bg-blue-50 border-blue-100 mt-3">
                  <p className="text-xs font-semibold text-blue-600 mb-0.5">Why</p>
                  <p className="text-sm text-blue-800">{drill.why}</p>
                </div>
                <button onClick={next} className="btn-primary mt-3">
                  {drillIndex + 1 >= pair.drills.length ? 'See result →' : 'Next scenario →'}
                </button>
              </>
            )}
          </>
        )}

        {finished && (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🧠</div>
            <p className="text-2xl font-bold text-gray-900">{score}/{pair.drills.length}</p>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              {score === pair.drills.length ? 'You\'ve got this pair down!' : 'Re-read the distinction and try again.'}
            </p>
            <button onClick={() => { setStep(0); setScore(0); setPicked(null) }} className="btn-primary mb-2">Review this pair again</button>
            <button onClick={onBack} className="w-full text-sm text-gray-500 py-2 active:scale-95">← Other pairs</button>
          </div>
        )}
      </div>
    </div>
  )
}
