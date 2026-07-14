'use client'
import { useState, type ReactNode } from 'react'
import KeywordText from '@/components/KeywordText'
import type { Question, ExamAnswer } from '@/lib/types'

// "Simulator" design — a desktop exam-simulator skin for the exam screen only
// (the rest of the app stays on Modern). This is presentation ONLY: every
// piece of state and every handler is passed in from ExamRunner, so exam
// logic, scoring, confirm/reveal rules, and session saving are untouched.
//
// Palette / type are deliberately hard-coded here rather than added to the
// global token layer: this skin is scoped to one screen and shouldn't leak
// into the Classic/Modern tokens.

const FONT = 'Arial, Helvetica, sans-serif'
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const NAVY = '#1f3d63'
const NAVY_HOVER = '#2c5286'
const AMBER = '#e0a33e'
const AMBER_HOVER = '#c98f31'
const STEEL = '#aeb4bb'
const STEEL_HOVER = '#9aa1a9'

type Props = {
  questions: Question[]
  answers: ExamAnswer[]
  current: number
  q: Question
  answer: ExamAnswer
  isLearning: boolean
  isMultiple: boolean
  confirmed: boolean
  submitting: boolean
  bankName: string
  secondsLeft: number | null
  elapsed: number
  hideTimer: boolean
  formatTime: (s: number) => string
  keywordOn: boolean
  highlights: Map<string, string[]>
  addHighlight: (phrase: string) => void
  removeHighlight: (phrase: string) => void
  bookmarks: Set<string>
  toggleStar: () => void
  toggleFlag: () => void
  toggleSelect: (i: number) => void
  confirmAnswer: () => void
  showAnswer: () => void
  next: () => void
  goPrev: () => void
  goTo: (i: number) => void
  submitExam: () => void
  onSaveExit: () => void
  hasResponse: (a: ExamAnswer) => boolean
  onDiscuss: () => void
  matchSlot: ReactNode | null
}

// Toolbar button — the chunky, flat, slightly-beveled look of the reference UI.
function BarButton({ children, onClick, disabled, color, hover, className = '' }: {
  children: ReactNode; onClick: () => void; disabled?: boolean
  color: string; hover: string; className?: string
}) {
  const [over, setOver] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      style={{ background: disabled ? '#c9ced4' : over ? hover : color, fontFamily: FONT }}
      className={`text-white text-[13px] font-bold px-4 py-2 border border-black/10 shadow-sm
        disabled:cursor-not-allowed active:translate-y-px transition-colors ${className}`}>
      {children}
    </button>
  )
}

export default function SimulatorExam(p: Props) {
  const [zoom, setZoom] = useState(100)
  const [showList, setShowList] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const { q, answer, questions, current, confirmed, isLearning } = p
  const revealed = confirmed   // answers/explanation are shown once the question is confirmed or revealed
  const flaggedCount = p.answers.filter(a => a.flagged).length
  const answeredCount = p.answers.filter(a => p.hasResponse(a)).length
  const correctLetters = q.correct_indices.map(i => OPTION_LABELS[i] ?? String(i)).join(', ')

  // "Review" in the reference UI jumps between marked questions.
  function jumpToNextMarked() {
    if (flaggedCount === 0) return
    const after = p.answers.findIndex((a, i) => i > current && a.flagged)
    const target = after !== -1 ? after : p.answers.findIndex(a => a.flagged)
    if (target !== -1) p.goTo(target)
  }

  // Row background for an option, mirroring the runner's own reveal rules.
  function rowStyle(i: number): { background: string; borderColor: string } {
    const sel = answer.selectedIndices.includes(i)
    const isCorrect = q.correct_indices.includes(i)
    if (revealed) {
      if (isCorrect) return { background: '#cdeecd', borderColor: '#6cbf6c' }
      if (sel) return { background: '#f7d4d4', borderColor: '#d98b8b' }
      return { background: 'transparent', borderColor: 'transparent' }
    }
    return sel
      ? { background: '#dcebf9', borderColor: '#a9c9e8' }
      : { background: 'transparent', borderColor: 'transparent' }
  }

  const keywordProps = {
    enabled: p.keywordOn,
    personal: p.keywordOn ? (p.highlights.get(q.id) ?? []) : [],
    onAddHighlight: p.keywordOn ? p.addHighlight : undefined,
    onRemoveHighlight: p.keywordOn ? p.removeHighlight : undefined,
  }

  return (
    <div className="sim-skin min-h-screen flex flex-col bg-[#f1f1f1]" style={{ fontFamily: FONT }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#bcbcbc] px-3 py-2 flex items-center gap-3 flex-wrap">
        <button onClick={p.toggleFlag}
          className="flex items-center gap-1.5 text-[13px] text-[#333] hover:text-black shrink-0">
          <span className={`w-3.5 h-3.5 border border-[#8a8a8a] inline-flex items-center justify-center text-[10px] leading-none
            ${answer.flagged ? 'bg-[#1f3d63] text-white border-[#1f3d63]' : 'bg-white'}`}>
            {answer.flagged ? '✓' : ''}
          </span>
          Mark
        </button>

        <div className="flex-1 text-center text-[14px] text-[#1f3d63] font-semibold min-w-[160px]">
          Question{' '}
          <span className="inline-block border border-[#9bb4cf] bg-[#eaf1f8] px-2 py-0.5 mx-1 font-bold">
            {current + 1}
          </span>{' '}
          of {questions.length}
          <span className="hidden sm:inline font-normal text-[#5b7a9c]"> ({p.bankName || 'Exam'})</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!p.hideTimer && (
            <span className={`text-[13px] font-bold tabular-nums ${
              p.secondsLeft !== null && p.secondsLeft <= 300 ? 'text-red-600' : 'text-[#444]'
            }`}>
              {p.secondsLeft !== null ? p.formatTime(p.secondsLeft) : p.formatTime(p.elapsed)}
            </span>
          )}
          <button onClick={p.toggleStar} className="text-[15px] leading-none" title="Bookmark">
            {p.bookmarks.has(q.id) ? '⭐' : '☆'}
          </button>
          <button onClick={() => setShowInstructions(true)}
            className="text-[13px] text-[#15599c] underline hover:text-[#0d3f74]">
            Instructions
          </button>
        </div>
      </div>

      {/* ── Question body ───────────────────────────────────────── */}
      <div className="flex-1 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4" style={{ fontSize: `${zoom}%` }}>
          <div className="text-[13px] text-[#1a1a1a] leading-[1.5] whitespace-pre-wrap break-words">
            <KeywordText text={q.question_text} {...keywordProps} />
          </div>

          {p.isMultiple && (
            <p className="text-[12px] text-[#7a4d00] bg-[#fff4d6] border border-[#e6d29a] px-2 py-1 mt-3 inline-block">
              Select ALL correct answers ({q.correct_indices.length} correct)
            </p>
          )}

          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image_url} alt="Exhibit" className="max-w-full border border-[#ccc] mt-3" />
          )}

          {/* Options */}
          <div className="mt-4">
            {p.matchSlot ? (
              <div className="mt-2">{p.matchSlot}</div>
            ) : (
              q.options.map((opt, i) => {
                const sel = answer.selectedIndices.includes(i)
                const style = rowStyle(i)
                return (
                  <button key={i} onClick={() => p.toggleSelect(i)}
                    style={{ background: style.background, borderColor: style.borderColor }}
                    className="w-full text-left flex items-start gap-2 px-2 py-1.5 border transition-colors hover:bg-[#f2f7fc]">
                    <span className={`mt-[3px] w-3.5 h-3.5 rounded-full border shrink-0 inline-flex items-center justify-center
                      ${revealed && q.correct_indices.includes(i)
                        ? 'border-[#3d9140] bg-white'
                        : sel ? 'border-[#2c5f9e] bg-white' : 'border-[#8a8a8a] bg-white'}`}>
                      {(sel || (revealed && q.correct_indices.includes(i))) && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          revealed && q.correct_indices.includes(i) ? 'bg-[#3d9140]' : 'bg-[#2c5f9e]'
                        }`} />
                      )}
                    </span>
                    <span className="text-[13px] text-[#1a1a1a] leading-[1.5] shrink-0 font-normal">
                      {OPTION_LABELS[i] ?? i}.
                    </span>
                    <span className="text-[13px] text-[#1a1a1a] leading-[1.5] whitespace-pre-wrap break-words select-text">
                      <KeywordText text={opt} {...keywordProps} />
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Answer + Explanation panel */}
          {revealed && (
            <div className="mt-4 bg-[#fdfbe0] border border-[#ddd8a8] px-3 py-2">
              {q.question_type !== 'match' && (
                <p className="text-[13px] text-[#1a1a1a] mb-1">
                  <span className="font-bold">Answer:</span> {correctLetters}
                </p>
              )}
              {q.explanation && (
                <>
                  <p className="text-[13px] text-[#1a1a1a] font-bold">Explanation:</p>
                  <p className="text-[13px] text-[#1a1a1a] leading-[1.5] whitespace-pre-wrap break-words">
                    {q.explanation}
                  </p>
                </>
              )}
              {isLearning && q.question_type !== 'match' && (
                <button onClick={p.onDiscuss}
                  className="mt-2 text-[12px] text-[#15599c] underline hover:text-[#0d3f74]">
                  💡 See why (AI Insight)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Zoom controls ───────────────────────────────────────── */}
      <div className="bg-white flex justify-end px-4 pb-2">
        <div className="flex flex-col border border-[#c4c4c4]">
          <button onClick={() => setZoom(z => Math.min(160, z + 10))}
            className="w-7 h-6 text-[14px] leading-none text-[#444] bg-[#f6f6f6] hover:bg-[#e6e6e6] border-b border-[#c4c4c4]">+</button>
          <button onClick={() => setZoom(z => Math.max(80, z - 10))}
            className="w-7 h-6 text-[14px] leading-none text-[#444] bg-[#f6f6f6] hover:bg-[#e6e6e6]">−</button>
        </div>
      </div>

      {/* ── Bottom toolbar ──────────────────────────────────────── */}
      <div className="border-t border-[#b0b0b0] bg-gradient-to-b from-[#e9e9e9] to-[#d6d6d6] px-3 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
          <BarButton onClick={p.goPrev} disabled={current === 0} color={NAVY} hover={NAVY_HOVER}>
            ‹ Previous
          </BarButton>
          <BarButton onClick={p.next} disabled={p.submitting} color={NAVY} hover={NAVY_HOVER}>
            Next ›
          </BarButton>

          {!confirmed && (
            <BarButton onClick={p.confirmAnswer} disabled={!p.hasResponse(answer)} color={NAVY} hover={NAVY_HOVER}>
              Confirm
            </BarButton>
          )}

          <div className="flex-1" />

          <BarButton onClick={jumpToNextMarked} disabled={flaggedCount === 0} color={AMBER} hover={AMBER_HOVER}>
            Review {flaggedCount > 0 ? `(${flaggedCount})` : ''} ▲
          </BarButton>

          {isLearning && !confirmed && (
            <BarButton onClick={p.showAnswer} color={AMBER} hover={AMBER_HOVER}>
              ◼ Show Answer
            </BarButton>
          )}

          <BarButton onClick={() => setShowList(true)} color={STEEL} hover={STEEL_HOVER}>
            ◻ Show List
          </BarButton>
          <BarButton onClick={p.onSaveExit} color={NAVY} hover={NAVY_HOVER}>
            Save Session
          </BarButton>
          <BarButton onClick={p.submitExam} disabled={p.submitting} color={NAVY} hover={NAVY_HOVER}>
            {p.submitting ? 'Submitting…' : 'End Exam'}
          </BarButton>
        </div>
      </div>

      {/* ── Question list overlay ───────────────────────────────── */}
      {showList && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowList(false)}>
          <div className="bg-white border border-[#8a8a8a] shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#1f3d63] text-white">
              <span className="text-[13px] font-bold">Question List</span>
              <button onClick={() => setShowList(false)} className="text-[16px] leading-none">×</button>
            </div>
            <div className="p-3 overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                {questions.map((_, i) => {
                  const a = p.answers[i]
                  const isCurrent = i === current
                  const answered = p.hasResponse(a)
                  return (
                    <button key={i}
                      onClick={() => { p.goTo(i); setShowList(false) }}
                      className={`relative h-8 text-[12px] font-bold border transition-colors ${
                        isCurrent ? 'bg-[#1f3d63] text-white border-[#1f3d63]'
                        : answered ? 'bg-[#cdeecd] text-[#20551f] border-[#8cc98c]'
                        : 'bg-white text-[#666] border-[#c4c4c4] hover:bg-[#eef4fa]'
                      }`}>
                      {i + 1}
                      {a.flagged && <span className="absolute -top-1 -right-1 text-[9px]">🚩</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-[#d0d0d0] px-3 py-2 flex items-center justify-between bg-[#f3f3f3]">
              <span className="text-[12px] text-[#555]">{answeredCount} of {questions.length} answered</span>
              <BarButton onClick={p.submitExam} disabled={p.submitting} color={NAVY} hover={NAVY_HOVER}>
                End Exam
              </BarButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Instructions overlay ────────────────────────────────── */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInstructions(false)}>
          <div className="bg-white border border-[#8a8a8a] shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#1f3d63] text-white">
              <span className="text-[13px] font-bold">Instructions</span>
              <button onClick={() => setShowInstructions(false)} className="text-[16px] leading-none">×</button>
            </div>
            <div className="p-4 text-[13px] text-[#333] leading-[1.6] space-y-2">
              <p><b>Mark</b> flags a question so you can come back to it — <b>Review</b> jumps between marked questions.</p>
              <p><b>Show List</b> opens the full question grid; green means answered.</p>
              {isLearning
                ? <p><b>Show Answer</b> reveals the correct answer without counting it as a wrong guess (it won&apos;t go into My Mistakes).</p>
                : <p>Answers are revealed after you finish — this is a timed practice exam.</p>}
              <p><b>Save Session</b> stores your progress and exits; you can resume on any device.</p>
              <p><b>End Exam</b> submits and scores everything answered so far.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
