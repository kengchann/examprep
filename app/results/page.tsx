'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useSettings, tapFeedback } from '@/lib/settings'
import { fetchBookmarkIds, addBookmark, removeBookmark } from '@/lib/bookmarks'
import { fetchHighlightMap, saveHighlights } from '@/lib/highlights'
import KeywordText from '@/components/KeywordText'
import InsightCard, { type TutorContext } from '@/components/InsightCard'
import { setDeck } from '@/lib/deck'
import type { AttemptResult, Question } from '@/lib/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function ResultsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bankName = params.get('bankName') || 'Exam'
  const mode = params.get('mode') || 'practice'
  const elapsed = parseInt(params.get('elapsed') || '0')
  const [tab, setTab] = useState<'summary' | 'review' | 'topics'>('summary')
  const [showFlagged, setShowFlagged] = useState(false)
  const { settings } = useSettings()

  // Starred questions, so the ⭐ on each review card shows the right state.
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  useEffect(() => { fetchBookmarkIds().then(setBookmarks) }, [])
  function toggleStar(questionId: string) {
    const has = bookmarks.has(questionId)
    tapFeedback(settings.feedback)
    setBookmarks(prev => {
      const n = new Set(prev)
      if (has) n.delete(questionId); else n.add(questionId)
      return n
    })
    if (has) removeBookmark(questionId); else addBookmark(questionId, null)
  }

  // AI tutor — which question's chat is open (null = closed).
  const [tutor, setTutor] = useState<TutorContext | null>(null)

  // Personal text highlights, so review matches what you marked during the exam.
  const [highlights, setHighlights] = useState<Map<string, string[]>>(new Map())
  useEffect(() => { fetchHighlightMap().then(setHighlights) }, [])
  function addHighlight(questionId: string, phrase: string) {
    const next = Array.from(new Set([...(highlights.get(questionId) ?? []), phrase]))
    setHighlights(prev => new Map(prev).set(questionId, next))
    saveHighlights(questionId, next)
  }
  function removeHighlight(questionId: string, phrase: string) {
    const next = (highlights.get(questionId) ?? []).filter(p => p.toLowerCase() !== phrase.toLowerCase())
    setHighlights(prev => new Map(prev).set(questionId, next))
    saveHighlights(questionId, next)
  }

  // Results are passed via sessionStorage (too large for the URL). Fall back to
  // the legacy ?results= query param if present, for older links.
  const [results, setResults] = useState<AttemptResult[]>([])
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('examprep_results')
      if (stored) { setResults(JSON.parse(stored)); return }
      const fromUrl = params.get('results')
      if (fromUrl) setResults(JSON.parse(fromUrl))
    } catch {}
  }, [params])

  const total = results.length
  const correct = results.filter(r => r.correct).length
  const wrong = results.filter(r => !r.correct && !r.skipped && r.selected_indices.length > 0).length
  const skipped = results.filter(r => r.skipped || r.selected_indices.length === 0).length
  const flagged = results.filter(r => r.flagged)
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = score >= 70
  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`

  // Topic breakdown
  const topicMap: Record<string, { correct: number; total: number }> = {}
  results.forEach(r => {
    const t = r.topic || 'General'
    if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 }
    topicMap[t].total++
    if (r.correct) topicMap[t].correct++
  })
  const topics = Object.entries(topicMap).sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))

  const reviewList = showFlagged ? flagged : results

  // Retake only the questions missed (wrong or skipped) in THIS attempt.
  const mistakes = results.filter(r => !r.correct)
  function retakeMistakes() {
    if (mistakes.length === 0) return
    const deck: Question[] = mistakes.map(r => ({
      id: r.questionId, bank_id: '', question_text: r.question_text,
      question_type: r.question_type, options: r.options, correct_indices: r.correct_indices,
      explanation: r.explanation, topic: r.topic, image_url: r.image_url,
      order_index: 0, created_at: '',
    }))
    setDeck(deck)
    const params = new URLSearchParams({ mode: 'learning', deck: '1', bankName: `Retake: ${bankName}` })
    router.push(`/exam?${params}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Score hero */}
      <div className={`px-4 pt-14 pb-6 text-center ${passed ? 'bg-green-600' : 'bg-red-500'}`}>
        <div className="text-5xl font-bold text-white mb-1">{score}%</div>
        <div className="text-white text-lg font-semibold">{passed ? '🎉 Passed!' : '😅 Keep practicing!'}</div>
        <div className="text-white/80 text-sm mt-1">{bankName}</div>
      </div>

      {/* Stat cards */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Correct', val: correct, color: 'text-green-600' },
            { label: 'Wrong', val: wrong, color: 'text-red-500' },
            { label: 'Skipped', val: skipped, color: 'text-amber-500' },
            { label: 'Time', val: formatTime(elapsed), color: 'text-gray-600' },
          ].map(s => (
            <div key={s.label} className="card text-center py-2 px-1">
              <div className={`text-base font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-2">
          <button onClick={() => router.back()} className="flex-1 bg-brand-600 text-white font-medium py-3 rounded-xl active:scale-95 text-sm">
            Try again
          </button>
          <button onClick={() => router.push('/dashboard')} className="flex-1 border border-gray-200 bg-white text-gray-700 font-medium py-3 rounded-xl active:scale-95 text-sm">
            Home
          </button>
        </div>
        {mistakes.length > 0 && (
          <button onClick={retakeMistakes} className="w-full border border-red-200 bg-red-50 text-red-600 font-medium py-3 rounded-xl active:scale-95 text-sm mb-4">
            🔁 Retake {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''}
          </button>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
          {([['summary', 'Summary'], ['topics', 'Topics'], ['review', 'Review']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Summary tab */}
        {tab === 'summary' && (
          <div className="space-y-3">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Score breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: 'Correct', count: correct, color: 'bg-green-500' },
                  { label: 'Wrong', count: wrong, color: 'bg-red-400' },
                  { label: 'Skipped', count: skipped, color: 'bg-amber-400' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{row.label}</span><span>{row.count}/{total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.count / total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {flagged.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-700">🚩 Flagged questions ({flagged.length})</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">Questions you marked during the exam</p>
                <button onClick={() => { setTab('review'); setShowFlagged(true) }}
                  className="btn-outline text-sm py-2">
                  Review flagged questions
                </button>
              </div>
            )}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-1">Pass threshold</h3>
              <p className="text-xs text-gray-400 mb-2">Most exams require 70% to pass</p>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <div className={`h-full rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: '70%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span className="text-gray-600">70% pass</span><span>100%</span></div>
            </div>
          </div>
        )}

        {/* Topics tab */}
        {tab === 'topics' && (
          <div className="space-y-2">
            {topics.length === 0 ? (
              <div className="card text-center py-6"><p className="text-gray-400 text-sm">No topic data available</p></div>
            ) : topics.map(([topic, data]) => {
              const pct = Math.round((data.correct / data.total) * 100)
              return (
                <div key={topic} className="card">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{topic}</span>
                    <span className={`text-sm font-bold ml-2 ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{data.correct}/{data.total} correct</p>
                </div>
              )
            })}
            <div className="card bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-700 font-medium">💡 Focus areas</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {topics.filter(([, d]) => d.correct / d.total < 0.7).map(([t]) => t).join(', ') || 'Great job — all topics above 70%!'}
              </p>
            </div>
          </div>
        )}

        {/* Review tab */}
        {tab === 'review' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {showFlagged ? `🚩 Flagged (${flagged.length})` : `All questions (${total})`}
              </h3>
              {flagged.length > 0 && (
                <button onClick={() => setShowFlagged(!showFlagged)}
                  className="text-xs text-brand-600 border border-brand-200 px-2 py-1 rounded-lg active:scale-95">
                  {showFlagged ? 'Show all' : '🚩 Flagged only'}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {reviewList.map((r, i) => (
                <div key={i} className="card">
                  <div className="flex items-start gap-2 mb-3">
                    <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${r.correct ? 'bg-green-500 text-white' : r.skipped || r.selected_indices.length === 0 ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'}`}>
                      {r.correct ? '✓' : r.skipped || r.selected_indices.length === 0 ? '–' : '✗'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        {r.flagged && <span className="text-xs">🚩</span>}
                        <span className={`tag text-xs ${r.question_type === 'multiple' ? 'bg-purple-100 text-purple-700' : r.question_type === 'truefalse' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.question_type === 'multiple' ? 'Multi' : r.question_type === 'truefalse' ? 'T/F' : 'Single'}
                        </span>
                        <button onClick={() => toggleStar(r.questionId)} className="ml-auto text-base active:scale-95" title="Bookmark this question">
                          {bookmarks.has(r.questionId) ? '⭐' : '☆'}
                        </button>
                      </div>
                      <div className="text-sm font-medium text-gray-800 leading-snug whitespace-pre-wrap break-words">
                        <KeywordText
                          text={r.question_text}
                          enabled={settings.highlightKeywords}
                          personal={highlights.get(r.questionId) ?? []}
                          onAddHighlight={phrase => addHighlight(r.questionId, phrase)}
                          onRemoveHighlight={phrase => removeHighlight(r.questionId, phrase)}
                        />
                      </div>
                      {r.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt="Exhibit" className="w-full rounded-lg border border-gray-100 mt-2" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 pl-7">
                    {r.options.map((opt, j) => (
                      <div key={j} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                        r.correct_indices.includes(j) ? 'bg-green-50 text-green-700' :
                        r.selected_indices.includes(j) ? 'bg-red-50 text-red-600' :
                        'text-gray-400'
                      }`}>
                        <span className="font-bold flex-shrink-0">{OPTION_LABELS[j]}.</span>
                        <span className="flex-1 whitespace-pre-wrap break-words">
                          <KeywordText
                            text={opt}
                            enabled={settings.highlightKeywords}
                            personal={highlights.get(r.questionId) ?? []}
                            onAddHighlight={phrase => addHighlight(r.questionId, phrase)}
                            onRemoveHighlight={phrase => removeHighlight(r.questionId, phrase)}
                          />
                        </span>
                        {r.correct_indices.includes(j) && <span className="flex-shrink-0">✓</span>}
                        {r.selected_indices.includes(j) && !r.correct_indices.includes(j) && <span className="flex-shrink-0">✗</span>}
                      </div>
                    ))}
                  </div>
                  {r.explanation && (
                    <div className="mt-3 pl-7 border-t border-gray-50 pt-2">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">Explanation</p>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{r.explanation}</p>
                    </div>
                  )}
                  <div className="mt-3 pl-7">
                    <button
                      onClick={() => setTutor({
                        question_id: r.questionId,
                        question_text: r.question_text,
                        options: r.options,
                        correct_indices: r.correct_indices,
                        selected_indices: r.selected_indices,
                        topic: r.topic,
                        explanation: r.explanation,
                      })}
                      className="text-xs font-medium text-brand-600 border border-brand-200 rounded-lg px-3 py-1.5 active:scale-95">
                      💡 See why
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tutor && <InsightCard context={tutor} onClose={() => setTutor(null)} />}
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading results…</p></div>}>
      <ResultsContent />
    </Suspense>
  )
}
