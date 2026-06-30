'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getSrs } from '@/lib/srs'
import { setDeck } from '@/lib/deck'
import BottomNav from '@/components/BottomNav'
import type { Question, AttemptResult } from '@/lib/types'

const SESSION = 20

// Review Queue — spaced repetition. Pulls items that are DUE (scheduled by the
// SRS engine) plus NEW lapses (most-recently-wrong questions not yet scheduled),
// all reconstructed from attempt history. Launches them as a learning deck; the
// exam runner updates the SRS schedule when the session finishes.
export default function ReviewQueuePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [deck, setLocalDeck] = useState<Question[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [building, setBuilding] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('attempts')
        .select('details, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Build qid -> latest Question, and most-recent outcome.
      const map = new Map<string, Question>()
      const recent = new Map<string, boolean>()
      for (const att of (data ?? []) as { details: AttemptResult[] | null }[]) {
        for (const r of att.details ?? []) {
          if (map.has(r.questionId)) continue
          map.set(r.questionId, {
            id: r.questionId, bank_id: '', question_text: r.question_text,
            question_type: r.question_type, options: r.options, correct_indices: r.correct_indices,
            explanation: r.explanation, topic: r.topic, image_url: r.image_url,
            order_index: 0, created_at: '',
          })
          recent.set(r.questionId, r.correct)
        }
      }

      const srs = getSrs()
      const now = Date.now()
      const due = Object.keys(srs).filter(id => srs[id].due <= now && map.has(id))
      const newWrong = Array.from(recent).filter(([id, ok]) => !ok && !(id in srs)).map(([id]) => id)
      const ids = [...due, ...newWrong].slice(0, SESSION)

      setDueCount(due.length)
      setNewCount(newWrong.length)
      setLocalDeck(ids.map(id => map.get(id)!).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [])

  function start() {
    if (deck.length === 0) return
    setBuilding(true)
    setDeck(deck)
    const params = new URLSearchParams({ mode: 'learning', deck: '1', srs: '1', bankName: 'Review Queue' })
    router.push(`/exam?${params}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">🔁 Review Queue</h1>
        <p className="text-brand-200 text-sm mt-0.5">Spaced repetition — resurfaces what you&apos;re about to forget</p>
      </div>

      <div className="px-4 pt-5">
        {loading ? (
          <div className="card animate-pulse h-28 bg-gray-100" />
        ) : deck.length > 0 ? (
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔁</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{deck.length} to review now</p>
                <p className="text-xs text-gray-400">
                  {dueCount > 0 && `${dueCount} due`}{dueCount > 0 && newCount > 0 && ' · '}{newCount > 0 && `${newCount} new lapse${newCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button onClick={start} disabled={building} className="btn-primary text-sm py-3 disabled:opacity-60">
              {building ? 'Starting…' : 'Start review →'}
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Correct answers wait longer before returning; misses come back soon.
            </p>
          </div>
        ) : (
          <div className="card text-center py-10">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-medium text-gray-700">Nothing due right now</p>
            <p className="text-sm text-gray-400 mt-1">Finish some questions (or a Sprint), and missed ones will show up here on a spaced schedule.</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4 text-sm">Back to Home</button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
