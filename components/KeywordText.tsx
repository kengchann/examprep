'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  splitKeywords, splitByPhrases, markClass,
  CATEGORY_META, STRENGTH_META, type Trigger,
} from '@/lib/keywords'

type Seg = { text: string; kind: 'plain' | 'keyword' | 'personal'; trigger?: Trigger }

function build(text: string, keywordEnabled: boolean, personal: string[]): Seg[] {
  const base = personal.length ? splitByPhrases(text, personal) : [{ text, matched: false }]
  const segs: Seg[] = []
  for (const part of base) {
    if (part.matched) {
      segs.push({ text: part.text, kind: 'personal' })
    } else if (keywordEnabled) {
      for (const k of splitKeywords(part.text)) {
        segs.push({ text: k.text, kind: k.trigger ? 'keyword' : 'plain', trigger: k.trigger })
      }
    } else {
      segs.push({ text: part.text, kind: 'plain' })
    }
  }
  return segs
}

// Renders question text with two layers of highlighting:
//  • keyword — built-in AWS trigger phrases, COLOURED BY CATEGORY (cost /
//    security / ops …) and weighted by how decisive they are. Tap for a
//    structured breakdown: what it signals, the services, and the trap it
//    rules out.
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
  const [hint, setHint] = useState<Trigger | null>(null)
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
          if (s.kind === 'keyword' && s.trigger) {
            const t = s.trigger
            return (
              <span
                key={i}
                onClick={e => { e.stopPropagation(); setHint(t) }}
                title={`${CATEGORY_META[t.category].label} · ${STRENGTH_META[t.strength].label}`}
                className={markClass(t)}
              >
                {s.text}
              </span>
            )
          }
          return <span key={i}>{s.text}</span>
        })}
      </span>

      {/* Keyword hint popover — what it signals, what it points to, and the
          distractor it rules out (the part students actually miss). */}
      {mounted && hint && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4" onClick={() => setHint(null)}>
          <div className="mx-auto max-w-md bg-gray-900 text-white rounded-2xl px-4 py-3.5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_META[hint.category].chip}`}>
                {CATEGORY_META[hint.category].label}
              </span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gray-700 text-gray-200">
                {STRENGTH_META[hint.strength].label}
              </span>
            </div>

            <p className="text-base font-semibold leading-snug">“{hint.phrase}”</p>
            <p className="text-sm mt-1 leading-relaxed text-gray-100">{hint.hint}</p>

            {hint.services && (
              <p className="text-sm mt-2 leading-relaxed">
                <span className="text-gray-400">Points to: </span>
                <span className="text-emerald-300 font-medium">{hint.services}</span>
              </p>
            )}

            {hint.trap && (
              <p className="text-sm mt-2 leading-relaxed bg-rose-950/60 border border-rose-900 rounded-lg px-2.5 py-2">
                <span className="text-rose-300 font-semibold">Trap: </span>
                <span className="text-rose-100">{hint.trap}</span>
              </p>
            )}

            <p className="text-[11px] text-gray-500 mt-2.5">
              {STRENGTH_META[hint.strength].blurb} · Tap anywhere to dismiss
            </p>
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
