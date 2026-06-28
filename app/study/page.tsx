'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchBookmarkedQuestions } from '@/lib/bookmarks'
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

export default function StudyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [wrong, setWrong] = useState<Question[]>([])
  const [starred, setStarred] = useState<Question[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [w, s] = await Promise.all([buildWrongDeck(), fetchBookmarkedQuestions()])
      setWrong(w)
      setStarred(s)
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Study Tools</h1>
        <p className="text-brand-200 text-sm mt-0.5">Drill the questions that matter most</p>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="card animate-pulse h-28 bg-gray-100" />)}</div>
        ) : (
          <>
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
              Both decks open in Learning mode — instant feedback and explanations.
            </p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
