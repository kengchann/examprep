'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TRIGGERS } from '@/lib/keywords'

const SESSION = 12

// Trigger Trainer — active recall: see an exam keyword/phrase, recall what it
// signals, reveal, self-rate. Pure static content (reuses the keyword
// dictionary). No AI.
export default function TriggerTrainerPage() {
  const router = useRouter()
  const cards = useMemo(() => [...TRIGGERS].sort(() => Math.random() - 0.5).slice(0, SESSION), [])
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const [done, setDone] = useState(false)

  const card = cards[i]

  function rate(gotIt: boolean) {
    if (gotIt) setKnown(k => k + 1)
    if (i + 1 >= cards.length) { setDone(true); return }
    setI(i + 1)
    setRevealed(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-brand-600 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="text-2xl font-bold text-white">{known}/{cards.length} recognized</h1>
        <p className="text-brand-200 text-sm mt-1 mb-8">
          {known === cards.length ? 'Trigger vocabulary on point!' : 'Triggers stick with repetition — run another set.'}
        </p>
        <button onClick={() => { setI(0); setKnown(0); setRevealed(false); setDone(false) }}
          className="w-full max-w-xs bg-white text-brand-600 font-bold py-3 rounded-2xl active:scale-95 mb-3">
          Another set
        </button>
        <button onClick={() => router.push('/learn')} className="w-full max-w-xs border border-white/40 text-white font-medium py-3 rounded-2xl active:scale-95">
          Back to Learn
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/learn')} className="text-gray-400 text-sm active:scale-95">← Exit</button>
          <span className="text-sm font-medium text-gray-500">{i + 1} of {cards.length}</span>
          <span className="text-sm font-bold text-amber-500">⚡ {known}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${((i) / cards.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-6">
        <div className="card flex-1 flex flex-col items-center justify-center text-center py-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">When you see this trigger…</p>
          <p className="text-2xl font-bold text-gray-900 leading-snug">“{card.phrase}”</p>
          {revealed && (
            <div className="mt-6 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-brand-600 mb-0.5">→ think</p>
              <p className="text-sm text-brand-800 leading-relaxed">{card.hint}</p>
            </div>
          )}
        </div>

        <div className="pt-5 space-y-2">
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-primary">Reveal answer</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => rate(false)} className="flex-1 border border-red-200 text-red-500 font-medium py-3 rounded-xl active:scale-95">↻ Review</button>
              <button onClick={() => rate(true)} className="flex-1 bg-green-500 text-white font-medium py-3 rounded-xl active:scale-95">✓ Knew it</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
