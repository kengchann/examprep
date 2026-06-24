'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useUserRole } from '@/lib/useUserRole'
import type { QuestionBank, ExamMode } from '@/lib/types'

const categoryIcon: Record<string, string> = { IT: '💻', Academic: '📖', Other: '📝' }

const modes: { id: ExamMode; label: string; icon: string; desc: string }[] = [
  { id: 'practice', label: 'Practice Exam', icon: '⏱️', desc: 'Timed, real exam feel' },
  { id: 'learning', label: 'Learning Mode', icon: '📖', desc: 'See answers instantly' },
  { id: 'custom',   label: 'Custom Mode',   icon: '⚙️', desc: 'Pick questions & time' },
]

export default function Dashboard() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)
  const [selectedMode, setSelectedMode] = useState<ExamMode>('practice')
  const { isAdmin } = useUserRole()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'there')
      supabase.rpc('touch_last_active')   // record activity (fire-and-forget)
      const { data } = await supabase.from('question_banks')
        .select('*').order('created_at', { ascending: false })
      setBanks(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function startExam() {
    if (!selectedBank) return
    const params = new URLSearchParams({
      bank: selectedBank.id,
      bankName: selectedBank.name,
      mode: selectedMode,
    })
    router.push(`/exam?${params}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-brand-200 text-sm">Welcome back,</p>
            <h1 className="text-white text-xl font-bold">
              {userName} 👋
              {isAdmin && <span className="ml-2 align-middle text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Admin</span>}
            </h1>
          </div>
          <button onClick={signOut} className="text-brand-200 text-sm py-1 px-3 rounded-lg border border-brand-400 active:scale-95">
            Sign out
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Bank picker */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">1. Choose a question bank</h2>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="card animate-pulse h-16 bg-gray-100" />)}</div>
          ) : banks.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-500">
                {isAdmin ? 'No banks yet.' : 'No exam banks available yet. Check back soon!'}
              </p>
              {isAdmin && <Link href="/admin/banks" className="btn-primary mt-3 text-sm">Create a bank</Link>}
            </div>
          ) : (
            <div className="space-y-2">
              {banks.map(bank => (
                <button key={bank.id} onClick={() => setSelectedBank(bank)}
                  className={`w-full text-left card flex items-center gap-3 transition-all active:scale-[0.98] ${selectedBank?.id === bank.id ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
                    {categoryIcon[bank.category] || '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{bank.name}</p>
                    <p className="text-xs text-gray-400">{bank.question_count} questions · {bank.category}</p>
                  </div>
                  {selectedBank?.id === bank.id && <span className="text-brand-600 text-lg">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode picker */}
        {selectedBank && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">2. Choose a mode</h2>
            <div className="space-y-2">
              {modes.map(m => (
                <button key={m.id} onClick={() => setSelectedMode(m.id)}
                  className={`w-full text-left card flex items-center gap-3 transition-all active:scale-[0.98] ${selectedMode === m.id ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </div>
                  {selectedMode === m.id && <span className="text-brand-600 text-lg ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start button */}
        {selectedBank && (
          <button onClick={startExam} className="btn-primary text-base py-4">
            Start {modes.find(m => m.id === selectedMode)?.label} →
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
