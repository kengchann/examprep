'use client'
import { useMemo, useState } from 'react'
import { splitKeywords } from '@/lib/keywords'

// Renders text with AWS exam "trigger words" highlighted. Tapping a highlight
// shows a short hint at the bottom of the screen. When `enabled` is false it
// renders the text as-is (no highlighting, no overhead).
export default function KeywordText({ text, enabled }: { text: string; enabled: boolean }) {
  const [hint, setHint] = useState<{ phrase: string; hint: string } | null>(null)
  const parts = useMemo(() => (enabled ? splitKeywords(text) : null), [text, enabled])

  if (!enabled || !parts) return <>{text}</>

  return (
    <>
      {parts.map((p, i) =>
        p.hint ? (
          <button
            key={i}
            type="button"
            onClick={e => { e.stopPropagation(); setHint({ phrase: p.text, hint: p.hint! }) }}
            className="align-baseline rounded bg-amber-100 text-amber-900 px-0.5 underline decoration-dotted decoration-amber-400 underline-offset-2"
          >
            {p.text}
          </button>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}

      {hint && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4" onClick={() => setHint(null)}>
          <div
            className="mx-auto max-w-md bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-wide text-amber-300 font-semibold">💡 “{hint.phrase}”</p>
            <p className="text-sm mt-1 leading-relaxed text-gray-100">{hint.hint}</p>
            <button onClick={() => setHint(null)} className="text-xs text-gray-400 mt-2">Tap anywhere to dismiss</button>
          </div>
        </div>
      )}
    </>
  )
}
