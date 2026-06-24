'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Question, ExamMode, ExamAnswer } from '@/lib/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const SESSION_KEY = 'examprep_session'

type CustomConfig = {
  from: number; to: number; timeLimit: number | null; shuffle: boolean
}

function ExamSetup({ questions, mode, onStart }: {
  questions: Question[]; mode: ExamMode;
  onStart: (qs: Question[], config: CustomConfig) => void
}) {
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(Math.min(10, questions.length))
  const [timeLimit, setTimeLimit] = useState<number | null>(90)
  const [shuffle, setShuffle] = useState(false)
  const [hasLimit, setHasLimit] = useState(mode === 'practice')

  const total = Math.max(0, to - from + 1)

  function start() {
    const slice = questions.slice(from - 1, to)
    const ordered = shuffle ? [...slice].sort(() => Math.random() - 0.5) : slice
    onStart(ordered, { from, to, timeLimit: hasLimit ? timeLimit : null, shuffle })
  }

  if (mode === 'practice') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-brand-600 px-4 pt-12 pb-5">
          <h1 className="text-white text-xl font-bold">⏱️ Practice Exam</h1>
          <p className="text-brand-200 text-sm">Timed · Real exam conditions</p>
        </div>
        <div className="px-4 pt-5 space-y-4">
          <div className="card space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Question range</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="number" className="input-field text-center" min={1} max={questions.length}
                    value={from} onChange={e => setFrom(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <span className="text-gray-400 pt-4">→</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="number" className="input-field text-center" min={from} max={questions.length}
                    value={to} onChange={e => setTo(Math.min(questions.length, parseInt(e.target.value) || from))} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{total} question{total !== 1 ? 's' : ''} selected · {questions.length} total</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Time limit: {timeLimit} minutes</label>
              <input type="range" min={10} max={180} step={5} value={timeLimit ?? 90}
                onChange={e => setTimeLimit(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>10 min</span><span>180 min</span></div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-gray-700">Shuffle question order</span>
            </label>
          </div>
          <button onClick={start} disabled={total === 0} className="btn-primary py-4 text-base">
            Start Practice Exam ({total} questions) →
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'custom') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-brand-600 px-4 pt-12 pb-5">
          <h1 className="text-white text-xl font-bold">⚙️ Custom Mode</h1>
          <p className="text-brand-200 text-sm">Your rules, your pace</p>
        </div>
        <div className="px-4 pt-5 space-y-4">
          <div className="card space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">Question range</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">From Q</p>
                  <input type="number" className="input-field text-center" min={1} max={questions.length}
                    value={from} onChange={e => setFrom(Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <span className="text-gray-400 pt-4">→</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">To Q</p>
                  <input type="number" className="input-field text-center" min={from} max={questions.length}
                    value={to} onChange={e => setTo(Math.min(questions.length, parseInt(e.target.value) || from))} />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{total} question{total !== 1 ? 's' : ''} · {questions.length} total</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-600">Time limit</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={hasLimit} onChange={e => setHasLimit(e.target.checked)} className="accent-brand-600" />
                  <span className="text-xs text-gray-500">Enable</span>
                </label>
              </div>
              {hasLimit && (
                <>
                  <input type="range" min={5} max={180} step={5} value={timeLimit ?? 30}
                    onChange={e => setTimeLimit(parseInt(e.target.value))} className="w-full" />
                  <p className="text-xs text-gray-500 mt-1 text-center">{timeLimit} minutes</p>
                </>
              )}
              {!hasLimit && <p className="text-xs text-gray-400">No time limit — study at your own pace</p>}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-gray-700">Shuffle question order</span>
            </label>
          </div>
          <button onClick={start} disabled={total === 0} className="btn-primary py-4 text-base">
            Start Custom Exam ({total} questions) →
          </button>
        </div>
      </div>
    )
  }

  // Learning mode — just start
  return null
}

function ExamRunner({ questions, mode, bankId, bankName, timeLimit }: {
  questions: Question[]; mode: ExamMode; bankId: string; bankName: string; timeLimit: number | null
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<ExamAnswer[]>(() =>
    questions.map(q => ({ questionId: q.id, selectedIndices: [], flagged: false, skipped: false, timeSpent: 0 }))
  )
  const [confirmed, setConfirmed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(timeLimit ? timeLimit * 60 : null)
  const [elapsed, setElapsed] = useState(0)
  const [showTimeWarning, setShowTimeWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionStartRef = useRef(Date.now())
  const warnedRef = useRef(false)

  const q = questions[current]
  const answer = answers[current]
  const isMultiple = q.question_type === 'multiple'
  const isLearning = mode === 'learning'

  // Timer
  useEffect(() => {
    if (paused) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      if (secondsLeft !== null) {
        setSecondsLeft(s => {
          if (s === null) return null
          if (s <= 1) { clearInterval(timerRef.current!); submitExam(); return 0 }
          return s - 1
        })
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, secondsLeft])

  // 5-minute warning — flash banner once when under 5 min remain
  useEffect(() => {
    if (secondsLeft !== null && secondsLeft <= 300 && secondsLeft > 0 && !warnedRef.current) {
      warnedRef.current = true
      setShowTimeWarning(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100])
      setTimeout(() => setShowTimeWarning(false), 6000)
    }
  }, [secondsLeft])

  const lowTime = secondsLeft !== null && secondsLeft <= 300

  function toggleSelect(i: number) {
    if (confirmed && !isLearning) return
    if (isLearning && confirmed) return
    setAnswers(prev => {
      const updated = [...prev]
      const cur = { ...updated[current] }
      if (isMultiple) {
        cur.selectedIndices = cur.selectedIndices.includes(i)
          ? cur.selectedIndices.filter(x => x !== i)
          : [...cur.selectedIndices, i]
      } else {
        cur.selectedIndices = [i]
      }
      updated[current] = cur
      return updated
    })
  }

  function confirmAnswer() {
    const spent = Math.round((Date.now() - questionStartRef.current) / 1000)
    setAnswers(prev => {
      const updated = [...prev]
      updated[current] = { ...updated[current], timeSpent: spent }
      return updated
    })
    setConfirmed(true)
  }

  function toggleFlag() {
    setAnswers(prev => {
      const updated = [...prev]
      updated[current] = { ...updated[current], flagged: !updated[current].flagged }
      return updated
    })
  }

  function goTo(index: number) {
    if (isLearning) {
      // Auto-confirm skipped
      setAnswers(prev => {
        const updated = [...prev]
        if (updated[current].selectedIndices.length === 0) updated[current] = { ...updated[current], skipped: true }
        return updated
      })
    }
    setCurrent(index)
    setConfirmed(isLearning ? answers[index].selectedIndices.length > 0 || answers[index].skipped : false)
    setShowNav(false)
    questionStartRef.current = Date.now()
  }

  function next() {
    setAnswers(prev => {
      const updated = [...prev]
      if (updated[current].selectedIndices.length === 0) updated[current] = { ...updated[current], skipped: true }
      return updated
    })
    if (current < questions.length - 1) {
      const target = current + 1
      setCurrent(target)
      // In learning mode, a question already answered/skipped should show its result again
      setConfirmed(isLearning ? (answers[target].selectedIndices.length > 0 || answers[target].skipped) : false)
      questionStartRef.current = Date.now()
    } else {
      submitExam()
    }
  }

  // Go back to the previous question (keeps answered/skipped state visible in learning mode)
  function goPrev() {
    if (current === 0) return
    const target = current - 1
    setCurrent(target)
    setConfirmed(isLearning ? (answers[target].selectedIndices.length > 0 || answers[target].skipped) : false)
    questionStartRef.current = Date.now()
  }

  function submitExam() {
    if (timerRef.current) clearInterval(timerRef.current)
    const results = questions.map((q, i) => {
      const a = answers[i]
      const sel = a.selectedIndices.sort()
      const cor = q.correct_indices.sort()
      const correct = sel.length === cor.length && sel.every((v, j) => v === cor[j])
      return {
        questionId: q.id, question_text: q.question_text,
        question_type: q.question_type, options: q.options,
        correct_indices: q.correct_indices, selected_indices: a.selectedIndices,
        explanation: q.explanation, topic: q.topic, image_url: q.image_url,
        correct, flagged: a.flagged, skipped: a.skipped,
      }
    })
    // Save to localStorage for history
    const attempt = {
      id: Date.now().toString(),
      bankId, bankName, mode,
      date: new Date().toISOString(),
      score: Math.round((results.filter(r => r.correct).length / results.length) * 100),
      correct: results.filter(r => r.correct).length,
      total: results.length,
      elapsed,
    }
    const history = JSON.parse(localStorage.getItem('examprep_history') || '[]')
    localStorage.setItem('examprep_history', JSON.stringify([attempt, ...history].slice(0, 50)))
    localStorage.removeItem(SESSION_KEY)

    const params = new URLSearchParams({ results: JSON.stringify(results), bankName, mode, elapsed: elapsed.toString() })
    router.push(`/results?${params}`)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const progress = ((current + 1) / questions.length) * 100
  const answeredCount = answers.filter(a => a.selectedIndices.length > 0).length
  const flaggedCount = answers.filter(a => a.flagged).length

  function optionStyle(i: number) {
    const sel = answer.selectedIndices.includes(i)
    const isCorrect = q.correct_indices.includes(i)
    if (isLearning && confirmed) {
      if (isCorrect) return 'border-green-500 bg-green-50 text-green-800'
      if (sel && !isCorrect) return 'border-red-400 bg-red-50 text-red-700'
      return 'border-gray-100 bg-gray-50 text-gray-400'
    }
    if (!isLearning && confirmed) {
      if (isCorrect) return 'border-green-500 bg-green-50 text-green-800'
      if (sel && !isCorrect) return 'border-red-400 bg-red-50 text-red-700'
      return 'border-gray-100 bg-gray-50 text-gray-400'
    }
    return sel ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-800'
  }

  function circleSyle(i: number) {
    const sel = answer.selectedIndices.includes(i)
    const isCorrect = q.correct_indices.includes(i)
    if (confirmed) {
      if (isCorrect) return 'bg-green-500 border-green-500 text-white'
      if (sel) return 'bg-red-400 border-red-400 text-white'
      return 'border-gray-200 text-gray-300'
    }
    return sel ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 text-gray-400'
  }

  if (paused) {
    return (
      <div className="min-h-screen bg-brand-600 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">⏸️</div>
        <h2 className="text-white text-2xl font-bold mb-2">Exam Paused</h2>
        <p className="text-brand-200 mb-1">{answeredCount} of {questions.length} answered</p>
        {secondsLeft !== null && <p className="text-brand-200 mb-8">{formatTime(secondsLeft)} remaining</p>}
        <button onClick={() => setPaused(false)} className="w-full max-w-xs bg-white text-brand-600 font-bold py-4 rounded-2xl active:scale-95 transition-all mb-3">
          Resume Exam
        </button>
        <button onClick={submitExam} className="w-full max-w-xs border border-white/40 text-white font-medium py-3 rounded-2xl active:scale-95">
          Submit & See Results
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-2 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setPaused(true)} className="text-gray-400 text-sm active:scale-95">⏸ Pause</button>
          <button onClick={() => setShowNav(true)} className="text-sm font-medium text-brand-600 active:scale-95">
            {current + 1}/{questions.length}
            {flaggedCount > 0 && <span className="ml-1 text-amber-500">🚩{flaggedCount}</span>}
          </button>
          {secondsLeft !== null ? (
            <span className={`text-sm font-bold ${lowTime ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
              ⏱ {formatTime(secondsLeft)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{formatTime(elapsed)}</span>
          )}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {isMultiple && (
          <p className="text-xs text-center text-purple-600 font-medium mt-1">
            Select ALL correct answers ({q.correct_indices.length} correct)
          </p>
        )}
      </div>

      {/* 5-minute warning banner */}
      {showTimeWarning && (
        <div className="sticky top-0 z-20 bg-red-500 text-white text-center text-sm font-semibold py-2 px-4 animate-pulse">
          ⚠️ Less than 5 minutes remaining!
        </div>
      )}

      {/* Question */}
      <div className="flex-1 px-4 py-5 flex flex-col">
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-brand-600 uppercase">Q{current + 1}</span>
            <span className={`tag text-xs ${
              q.question_type === 'multiple' ? 'bg-purple-100 text-purple-700' :
              q.question_type === 'truefalse' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {q.question_type === 'multiple' ? 'Multiple answer' : q.question_type === 'truefalse' ? 'True / False' : 'Single answer'}
            </span>
            <button onClick={toggleFlag} className="ml-auto text-lg active:scale-95">
              {answer.flagged ? '🚩' : '⚑'}
            </button>
          </div>
          <p className="text-gray-900 text-base leading-relaxed font-medium whitespace-pre-wrap break-words">{q.question_text}</p>
          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image_url} alt="Exhibit" className="w-full rounded-xl border border-gray-100 mt-3" />
          )}
        </div>

        <div className="space-y-3 flex-1">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => toggleSelect(i)}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-start gap-3 ${optionStyle(i)}`}>
              <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 border-2 ${circleSyle(i)}`}>
                {OPTION_LABELS[i] || i}
              </span>
              <span className="text-sm leading-relaxed whitespace-pre-wrap break-words">{opt}</span>
              {confirmed && q.correct_indices.includes(i) && <span className="ml-auto text-green-600 flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>

        {/* Explanation (learning mode) */}
        {isLearning && confirmed && q.explanation && (
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-blue-600 mb-1">Explanation</p>
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap break-words">{q.explanation}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-5 pb-4 space-y-2">
          {!confirmed ? (
            <button onClick={confirmAnswer} disabled={answer.selectedIndices.length === 0} className="btn-primary">
              Confirm answer
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              {current < questions.length - 1 ? 'Next question →' : '📊 See results →'}
            </button>
          )}
          {/* Back / Skip row — Previous lets you revisit earlier questions in learning mode */}
          <div className="flex gap-2">
            {isLearning && current > 0 && (
              <button onClick={goPrev}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl active:scale-95">
                ← Previous
              </button>
            )}
            {!confirmed && (
              <button onClick={next} className="flex-1 text-gray-400 text-sm py-2 active:scale-95">
                Skip question
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Question navigator overlay */}
      {showNav && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end" onClick={() => setShowNav(false)}>
          <div className="bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Jump to question</h3>
              <button onClick={() => setShowNav(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="flex gap-2 text-xs mb-4 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-brand-600 inline-block" /> Current</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-green-500 inline-block" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-gray-200 inline-block" /> Unanswered</span>
              <span className="flex items-center gap-1"><span className="text-amber-500">🚩</span> Flagged</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {questions.map((_, i) => {
                const a = answers[i]
                const isCurrent = i === current
                const isAnswered = a.selectedIndices.length > 0
                return (
                  <button key={i} onClick={() => goTo(i)}
                    className={`relative h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                      isCurrent ? 'bg-brand-600 text-white' :
                      isAnswered ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                    {i + 1}
                    {a.flagged && <span className="absolute -top-1 -right-1 text-xs">🚩</span>}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={submitExam} className="btn-danger">
                Submit exam ({answeredCount}/{questions.length} answered)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExamContent() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [setupDone, setSetupDone] = useState(false)
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const bankId = params.get('bank') || ''
  const bankName = params.get('bankName') || ''
  const mode = (params.get('mode') || 'practice') as ExamMode
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('questions').select('*').eq('bank_id', bankId).order('order_index')
      if (!data || data.length === 0) { alert('No questions in this bank.'); router.push('/dashboard'); return }
      setAllQuestions(data as Question[])
      // Learning mode starts immediately with all questions
      if (mode === 'learning') {
        setExamQuestions(data as Question[])
        setSetupDone(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">📋</div><p className="text-gray-500">Loading exam…</p></div>
    </div>
  )

  if (!setupDone && mode !== 'learning') {
    return (
      <ExamSetup questions={allQuestions} mode={mode} onStart={(qs, config) => {
        setExamQuestions(qs)
        setTimeLimit(config.timeLimit)
        setSetupDone(true)
      }} />
    )
  }

  return <ExamRunner questions={examQuestions} mode={mode} bankId={bankId} bankName={bankName} timeLimit={timeLimit} />
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>}>
      <ExamContent />
    </Suspense>
  )
}
