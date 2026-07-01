'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchMistakeQuestions, removeMistake } from '@/lib/mistakes'
import { setDeck } from '@/lib/deck'
import BottomNav from '@/components/BottomNav'
import type { Question } from '@/lib/types'

// "My Mistakes" — a persistent, user-curated deck. Every question you miss
// (in any mode) is added automatically. It stays here until YOU mark it
// mastered — nothing here disappears just because you got it right elsewhere.
export default function MistakesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    fetchMistakeQuestions().then(qs => { setQuestions(qs); setLoading(false) })
  }, [])

  async function mastered(id: string) {
    setRemovingId(id)
    await removeMistake(id)
    setQuestions(prev => prev.filter(q => q.id !== id))
    setRemovingId(null)
  }

  function study() {
    if (questions.length === 0) return
    setDeck(questions)
    const params = new URLSearchParams({ mode: 'learning', deck: '1', bankName: '📌 My Mistakes' })
    router.push(`/exam?${params}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">📌 My Mistakes</h1>
        <p className="text-brand-200 text-sm mt-0.5">Stays until you mark it mastered</p>
      </div>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}</div>
        ) : questions.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-medium text-gray-700">No mistakes saved</p>
            <p className="text-sm text-gray-400 mt-1">Any question you get wrong — in any mode — is added here automatically.</p>
            <button onClick={() => router.push('/study')} className="btn-primary mt-4 text-sm">Back to Study Tools</button>
          </div>
        ) : (
          <>
            <button onClick={study} className="btn-primary text-sm py-3 mb-4">
              Study all {questions.length} question{questions.length !== 1 ? 's' : ''} →
            </button>
            <div className="space-y-2">
              {questions.map(q => (
                <div key={q.id} className="card">
                  <p className="text-sm text-gray-800 leading-snug line-clamp-3 whitespace-pre-wrap break-words mb-2">
                    {q.question_text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="tag bg-gray-100 text-gray-500 text-xs">{q.topic || 'General'}</span>
                    <button onClick={() => mastered(q.id)} disabled={removingId === q.id}
                      className="text-xs font-medium text-green-600 border border-green-200 rounded-lg px-3 py-1.5 active:scale-95 disabled:opacity-50">
                      {removingId === q.id ? '…' : '✓ Mastered — remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
