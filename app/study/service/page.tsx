'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchServiceCounts, fetchQuestionsByService, type ServiceCount } from '@/lib/services'
import { setDeck } from '@/lib/deck'
import BottomNav from '@/components/BottomNav'

export default function StudyByServicePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceCount[]>([])
  const [building, setBuilding] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setServices(await fetchServiceCounts())
      setLoading(false)
    }
    load()
  }, [])

  async function launch(service: string) {
    setBuilding(service)
    const deck = await fetchQuestionsByService(service)
    setBuilding(null)
    if (deck.length === 0) return
    setDeck(deck)
    const params = new URLSearchParams({ mode: 'learning', deck: '1', bankName: `🔧 ${service} (${deck.length})` })
    router.push(`/exam?${params}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Study by Service</h1>
        <p className="text-brand-200 text-sm mt-0.5">Drill one AWS service at a time</p>
      </div>

      <div className="px-4 pt-5 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="card animate-pulse h-14 bg-gray-100" />)}</div>
        ) : services.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-2">🔧</p>
            <p className="text-gray-500 text-sm">
              No questions are tagged by service yet. An admin can run
              &ldquo;Auto-tag services&rdquo; from the Questions screen.
            </p>
          </div>
        ) : (
          services.map(s => (
            <button key={s.service} onClick={() => launch(s.service)} disabled={building !== null}
              className="card w-full flex items-center justify-between py-3.5 active:scale-[0.98] disabled:opacity-60">
              <span className="font-medium text-gray-900">{s.service}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{s.count} Qs</span>
                <span className="text-brand-600 text-sm font-medium">
                  {building === s.service ? 'Building…' : 'Study →'}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
