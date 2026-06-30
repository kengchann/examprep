'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type TutorContext = {
  question_id?: string
  question_text: string
  options: string[]
  correct_indices: number[]
  selected_indices: number[]
  topic: string
  explanation: string
}

type Card = {
  why_correct: string
  distractors: { letter: string; why: string }[]
  exam_keyword: string
  real_world: string
  misconception: string
  memory_trick: string
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const FOLLOWUP_CHIPS = ['Explain even simpler', 'Give another example', 'When is the wrong answer right?']
const MAX_FOLLOWUPS = 2

// A structured, one-screen "Insight Card" — the redesigned AI Study Assistant.
// One AI call builds the card; follow-ups are capped focused chips.
export default function InsightCard({ context, onClose }: { context: TutorContext; onClose: () => void }) {
  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followups, setFollowups] = useState<{ q: string; a: string }[]>([])
  const [asking, setAsking] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    fetch('/api/tutor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'card', context }),
    })
      .then(r => r.json())
      .then(d => { if (!active) return; if (d.card) setCard(d.card); else setError(d.error || 'Could not load the insight.') })
      .catch(() => { if (active) setError('Could not reach the AI coach.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const remaining = MAX_FOLLOWUPS - followups.length
  async function ask(q: string) {
    if (asking || remaining <= 0) return
    setAsking(true)
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'followup', context, card, question: q }),
      })
      const d = await res.json()
      setFollowups(f => [...f, { q, a: d.error ? `(${d.error})` : d.text }])
    } catch {
      setFollowups(f => [...f, { q, a: '(Could not reach the coach.)' }])
    } finally {
      setAsking(false)
    }
  }

  // Local, no-AI computations
  const correctSet = new Set(context.correct_indices)
  const correctLetters = context.correct_indices.map(i => OPTION_LABELS[i]).join(', ')
  const wrongPicked = context.selected_indices.filter(i => !correctSet.has(i))
  const gotItRight = context.selected_indices.length > 0 && wrongPicked.length === 0 &&
    context.selected_indices.length === context.correct_indices.length
  const whyMap = new Map((card?.distractors ?? []).map(d => [d.letter.toUpperCase().trim(), d.why]))

  const Row = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{icon} {label}</p>
      <p className="text-sm text-gray-800 leading-snug mt-0.5">{children}</p>
    </div>
  )

  const body = (
    <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col justify-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-tight">Insight</p>
              <p className="text-xs text-gray-400 leading-tight">{context.topic || 'This question'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto px-4 py-2">
          {loading && (
            <div className="space-y-2 py-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${90 - i * 8}%` }} />)}
              <p className="text-xs text-gray-400 pt-2">Building your insight…</p>
            </div>
          )}

          {error && !loading && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>
              <button onClick={() => location.reload()} className="text-xs text-brand-600 mt-2">Tap to retry</button>
            </div>
          )}

          {card && !loading && (
            <>
              {gotItRight ? (
                <Row icon="✅" label="You nailed it">{card.why_correct}</Row>
              ) : (
                <>
                  {wrongPicked.map(i => (
                    <Row key={i} icon="❌" label={`Your answer (${OPTION_LABELS[i]}) — why it's wrong`}>
                      {whyMap.get(OPTION_LABELS[i]) ?? 'Not the best fit for this scenario.'}
                    </Row>
                  ))}
                  {wrongPicked.length === 0 && (
                    <Row icon="⏭️" label="You skipped this one">Here's how to think about it:</Row>
                  )}
                  <Row icon="✅" label={`Correct (${correctLetters}) — why it's better`}>{card.why_correct}</Row>
                </>
              )}
              <Row icon="⚠️" label="Exam keyword">{card.exam_keyword}</Row>
              <Row icon="🏢" label="Real-world trigger">{card.real_world}</Row>
              <Row icon="🧠" label="Common misconception">{card.misconception}</Row>
              <Row icon="📌" label="Memory trick">{card.memory_trick}</Row>

              {/* Follow-ups */}
              {followups.map((f, i) => (
                <div key={i} className="mt-2 bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs font-medium text-brand-600">{f.q}</p>
                  <p className="text-sm text-gray-700 leading-snug mt-0.5 whitespace-pre-wrap break-words">{f.a}</p>
                </div>
              ))}
              {asking && <p className="text-xs text-gray-400 mt-2 px-1">Thinking…</p>}
            </>
          )}
        </div>

        {/* Footer: capped follow-up chips */}
        {card && !loading && (
          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
            {remaining > 0 ? (
              <>
                <p className="text-[11px] text-gray-400 mb-1.5">Need more? ({remaining} left)</p>
                <div className="flex flex-wrap gap-1.5">
                  {FOLLOWUP_CHIPS.map(s => (
                    <button key={s} onClick={() => ask(s)} disabled={asking}
                      className="text-xs border border-brand-200 text-brand-600 rounded-full px-3 py-1.5 active:scale-95 disabled:opacity-40">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center">You've got the core idea — try a question on this topic next. 💪</p>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(body, document.body)
}
