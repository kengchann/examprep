'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { splitKeywords, splitByPhrases } from '@/lib/keywords'

type Seg = { text: string; kind: 'plain' | 'keyword' | 'personal'; hint?: string }

function build(text: string, keywordEnabled: boolean, personal: string[]): Seg[] {
  const base = personal.length ? splitByPhrases(text, personal) : [{ text, matched: false }]
  const segs: Seg[] = []
  for (const part of base) {
    if (part.matched) {
      segs.push({ text: part.text, kind: 'personal' })
    } else if (keywordEnabled) {
      for (const k of splitKeywords(part.text)) {
        segs.push({ text: k.text, kind: k.hint ? 'keyword' : 'plain', hint: k.hint })
      }
    } else {
      segs.push({ text: part.text, kind: 'plain' })
    }
  }
  return segs
}

// Renders question text with two layers of highlighting:
//  • keyword (amber) — built-in AWS trigger phrases, tap for a hint
//  • personal (yellow) — phrases the student saved by selecting text; tap to remove
// When `onAddHighlight` is provided, selecting text shows a "Highlight" bar.
export default function KeywordText({
  text,
  enabled,
  personal = [],
  onAddHighlight,
  onRemoveHighlight,
}: {
  text: string
  enabled: boolean
  personal?: string[]
  onAddHighlight?: (phrase: string) => void
  onRemoveHighlight?: (phrase: string) => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hint, setHint] = useState<{ phrase: string; hint: string } | null>(null)
  const [pending, setPending] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const segs = useMemo(() => build(text, enabled, personal), [text, enabled, personal])

  // After a selection, offer to save it as a personal highlight.
  function onSelectEnd() {
    if (!onAddHighlight) return
    const sel = window.getSelection()
    const raw = sel ? sel.toString() : ''
    const trimmed = raw.trim()
    const inside = !!sel && !!sel.anchorNode && !!ref.current &&
      ref.current.contains(sel.anchorNode) && ref.current.contains(sel.focusNode)
    setPending(trimmed.length >= 2 && inside ? trimmed : '')
  }

  function saveSelection() {
    if (!pending || !onAddHighlight) return
    onAddHighlight(pending)
    window.getSelection()?.removeAllRanges()
    setPending('')
  }

  return (
    <>
      <span ref={ref} onMouseUp={onSelectEnd} onTouchEnd={onSelectEnd}>
        {segs.map((s, i) => {
          // NOTE: these are <span>, not <button>, so they can be embedded inside
          // the answer-option buttons without invalid nested-button markup.
          if (s.kind === 'personal') {
            const removable = !!onRemoveHighlight
            return (
              <span
                key={i}
                onClick={removable ? (e => { e.stopPropagation(); onRemoveHighlight!(s.text) }) : undefined}
                title={removable ? 'Tap to remove your highlight' : undefined}
                className={`rounded bg-yellow-200 text-yellow-900 ${removable ? 'cursor-pointer' : ''}`}
              >
                {s.text}
              </span>
            )
          }
          if (s.kind === 'keyword') {
            return (
              <span
                key={i}
                onClick={e => { e.stopPropagation(); setHint({ phrase: s.text, hint: s.hint! }) }}
                className="cursor-pointer rounded bg-amber-100 text-amber-900 px-0.5 underline decoration-dotted decoration-amber-400 underline-offset-2"
              >
                {s.text}
              </span>
            )
          }
          return <span key={i}>{s.text}</span>
        })}
      </span>

      {/* Keyword hint popover */}
      {mounted && hint && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4" onClick={() => setHint(null)}>
          <div className="mx-auto max-w-md bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-xs uppercase tracking-wide text-amber-300 font-semibold">💡 “{hint.phrase}”</p>
            <p className="text-sm mt-1 leading-relaxed text-gray-100">{hint.hint}</p>
            <button onClick={() => setHint(null)} className="text-xs text-gray-400 mt-2">Tap anywhere to dismiss</button>
          </div>
        </div>,
        document.body
      )}

      {/* "Highlight selected text" bar */}
      {mounted && pending && onAddHighlight && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[70] p-4">
          <div className="mx-auto max-w-md bg-yellow-400 text-yellow-950 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
            <span className="text-sm flex-1 truncate">🖍 Highlight “{pending.replace(/\s+/g, ' ')}”</span>
            <button onClick={saveSelection} className="bg-yellow-950 text-yellow-50 text-sm font-semibold px-3 py-1.5 rounded-lg active:scale-95">
              Save
            </button>
            <button onClick={() => { window.getSelection()?.removeAllRanges(); setPending('') }} className="text-yellow-900 text-sm px-1">
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
