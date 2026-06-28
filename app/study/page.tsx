'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchBookmarkedQuestions } from '@/lib/bookmarks'
import { computeWeakTopics, buildWeakDeck, type TopicStat } from '@/lib/weakAreas'
import { setDeck } from '@/lib/deck'
import BottomNav from '@/components/BottomNav'
import type { Question, AttemptResult } from '@/lib/types'

// Build the "wrong answers" deck: every question whose MOST RECENT attempt was
// wrong. Questions you've since gotten right drop off automatically.
async function buildWrongDeck(): Promise<Question[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('attempts')
    .select('details, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const seen = new Set<string>()
  const deck: Question[] = []
  for (const att of (data ?? []) as { details: AttemptResult[] | null }[]) {
    for (const r of att.details ?? []) {
      if (seen.has(r.questionId)) continue   // only the most recent outcome counts
      seen.add(r.questionId)
      if (!r.correct) {
        deck.push({
          id: r.questionId, bank_id: '', question_text: r.question_text,
          question_type: r.question_type, options: r.options, correct_indices: r.correct_indices,
          explanation: r.explanation, topic: r.topic, image_url: r.image_url,
          order_index: 0, created_at: '',
        })
      }
    }
  }
  return deck
}

const COUNTS = [10, 20, 50] as const

export default function StudyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [wrong, setWrong] = useState<Question[]>([])
  const [starred, setStarred] = useState<Question[]>([])
  const [weakTopics, setWeakTopics] = useState<TopicStat[]>([])
  const [count, setCount] = useState<number>(20)
  const [building, setBuilding] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [w, s, t] = await Promise.all([buildWrongDeck(), fetchBookmarkedQuestions(), computeWeakTopics()])
      setWrong(w)
      setStarred(s)
      setWeakTopics(t)
      setLoading(false)
    }
    load()
  }, [])

  function launch(questions: Question[], bankName: string) {
    if (questions.length === 0) return
    setDeck(questions)
    const params = new URLSearchParams({ mode: 'learning', deck: '1', bankName })
    router.push(`/exam?${params}`)
  }

  async function launchWeak() {
    setBuilding(true)
    const { deck } = await buildWeakDeck(count)
    setBuilding(false)
    if (deck.length === 0) { alert('No weak-area questions available yet — finish a full exam first.'); return }
    launch(deck, `🎯 Weak areas (${deck.length})`)
  }

  // Only topics you're actually weak in (accuracy < 100%), worst first.
  const weak = weakTopics.filter(t => t.weakness > 0.001).slice(0, 5)
  const barColor = (acc: number) => acc >= 0.7 ? 'bg-green-500' : acc >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
  const pctColor = (acc: number) => acc >= 0.7 ? 'text-green-600' : acc >= 0.5 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Study Tools</h1>
        <p className="text-brand-200 text-sm mt-0.5">Drill the questions that matter most</p>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-28 bg-gray-100" />)}</div>
        ) : (
          <>
            {/* Adaptive weak-area practice */}
            <div className="card border-brand-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🎯</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Practice weak areas</p>
                  <p className="text-xs text-gray-400">Adaptive — focuses on your weakest topics first</p>
                </div>
              </div>

              {weak.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                  {weakTopics.length === 0
                    ? 'Finish a full exam and your weak topics will appear here for targeted practice.'
                    : 'No weak areas right now — you\'re above 100% recent accuracy across topics. 🎉'}
                </p>
              ) : (
                <>
                  {/* Top weak topics */}
                  <div className="space-y-2 mb-4">
                    {weak.map(t => (
                      <div key={t.topic}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-medium text-gray-700 truncate flex-1">{t.topic}</span>
                          <span className={`text-xs font-bold ml-2 ${pctColor(t.accuracy)}`}>{Math.round(t.accuracy * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(t.accuracy)}`} style={{ width: `${Math.round(t.accuracy * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Length picker */}
                  <p className="text-xs font-medium text-gray-500 mb-1.5">How many questions?</p>
                  <div className="flex bg-gray-200 rounded-xl p-1 mb-3">
                    {COUNTS.map(c => (
                      <button key={c} onClick={() => setCount(c)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${count === c ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
                        {c}
                      </button>
                    ))}
                  </div>

                  <button onClick={launchWeak} disabled={building} className="btn-primary text-sm py-3 disabled:opacity-60">
                    {building ? 'Building your set…' : `Practice ${count} weak-area questions →`}
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Weakest topics get the most questions. As you improve, they drop down the list.
                  </p>
                </>
              )}
            </div>

            {/* Wrong answers */}
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Review wrong answers</p>
                  <p className="text-xs text-gray-400">Questions you most recently got wrong</p>
                </div>
                <span className="text-xl font-bold text-red-500">{wrong.length}</span>
              </div>
              {wrong.length > 0 ? (
                <button onClick={() => launch(wrong, 'Review: Wrong answers')} className="btn-primary text-sm py-3">
                  Study {wrong.length} question{wrong.length !== 1 ? 's' : ''} →
                </button>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                  Nothing here — finish an exam and any misses show up for focused review. 🎉
                </p>
              )}
            </div>

            {/* Starred */}
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⭐</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Starred questions</p>
                  <p className="text-xs text-gray-400">Bookmarks you saved while studying</p>
                </div>
                <span className="text-xl font-bold text-amber-500">{starred.length}</span>
              </div>
              {starred.length > 0 ? (
                <button onClick={() => launch(starred, '⭐ Starred questions')} className="btn-primary text-sm py-3">
                  Study {starred.length} question{starred.length !== 1 ? 's' : ''} →
                </button>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                  Tap the ☆ on any question during an exam or review to save it here.
                </p>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 pt-2">
              All decks open in Learning mode — instant feedback and explanations.
            </p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
