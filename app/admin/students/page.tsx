'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import type { Profile, QuestionBank, Attempt } from '@/lib/types'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function relative(s: string | null) {
  if (!s) return 'never'
  const diff = Date.now() - new Date(s).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(s)
}

export default function StudentsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [banks, setBanks] = useState<Pick<QuestionBank, 'id' | 'name' | 'is_open'>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [myId, setMyId] = useState('')

  // Manage modal
  const [managing, setManaging] = useState<Profile | null>(null)
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [loadingManage, setLoadingManage] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }
      setMyId(user.id)

      const [{ data: profs }, { data: bks }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('question_banks').select('id, name, is_open').order('name'),
      ])
      setProfiles((profs as Profile[]) || [])
      setBanks((bks as Pick<QuestionBank, 'id' | 'name' | 'is_open'>[]) || [])
      setLoading(false)
    }
    init()
  }, [])

  async function openManage(p: Profile) {
    setManaging(p); setAssigned(new Set()); setAttempts([]); setAttemptCount(0); setLoadingManage(true)
    const [{ data: acc }, { data: att }, { count }] = await Promise.all([
      supabase.from('bank_access').select('bank_id').eq('student_id', p.id),
      supabase.from('attempts').select('*').eq('user_id', p.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', p.id),
    ])
    setAssigned(new Set((acc || []).map(r => r.bank_id)))
    setAttempts((att as Attempt[]) || [])
    setAttemptCount(count ?? 0)
    setLoadingManage(false)
  }

  async function toggleAccess(bankId: string, currentlyAssigned: boolean) {
    if (!managing) return
    setAssigned(prev => {
      const s = new Set(prev)
      if (currentlyAssigned) s.delete(bankId); else s.add(bankId)
      return s
    })
    if (currentlyAssigned) {
      await supabase.from('bank_access').delete().eq('student_id', managing.id).eq('bank_id', bankId)
    } else {
      await supabase.from('bank_access').insert({ student_id: managing.id, bank_id: bankId })
    }
  }

  async function toggleRole() {
    if (!managing || managing.id === myId) return
    const newRole = managing.role === 'admin' ? 'student' : 'admin'
    if (!confirm(`Change ${managing.email} to ${newRole.toUpperCase()}?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', managing.id)
    setProfiles(prev => prev.map(p => p.id === managing.id ? { ...p, role: newRole } : p))
    setManaging(prev => prev ? { ...prev, role: newRole } : prev)
  }

  const filtered = profiles.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
  })

  const adminCount = profiles.filter(p => p.role === 'admin').length
  const studentCount = profiles.length - adminCount

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Students</h1>
        <p className="text-brand-200 text-sm mt-0.5">Manage users and bank access</p>
      </div>

      <div className="px-4 pt-4">
        {/* Summary */}
        {!loading && (
          <div className="flex gap-2 mb-4">
            <div className="card flex-1 text-center py-3">
              <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
              <p className="text-xs text-gray-400">Students</p>
            </div>
            <div className="card flex-1 text-center py-3">
              <p className="text-2xl font-bold text-gray-900">{adminCount}</p>
              <p className="text-xs text-gray-400">Admins</p>
            </div>
            <div className="card flex-1 text-center py-3">
              <p className="text-2xl font-bold text-gray-900">{banks.length}</p>
              <p className="text-xs text-gray-400">Banks</p>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <input className="input-field pr-9" placeholder="🔍 Search name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-16 bg-gray-100" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-8"><p className="text-gray-400 text-sm">No users found.</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button key={p.id} onClick={() => openManage(p)}
                className="w-full text-left card flex items-center gap-3 active:scale-[0.98]">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center flex-shrink-0 uppercase">
                  {(p.full_name || p.email || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{p.full_name || 'Unnamed'}</p>
                    {p.role === 'admin' && <span className="tag bg-brand-50 text-brand-600 text-xs">Admin</span>}
                    {p.id === myId && <span className="tag bg-gray-100 text-gray-500 text-xs">You</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Joined {fmtDate(p.created_at)}</p>
                  <p className="text-xs text-gray-300">Active {relative(p.last_active)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manage modal */}
      {managing && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col justify-end" onClick={() => setManaging(null)}>
          <div className="bg-white rounded-t-3xl max-h-[90vh] w-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-800 truncate">{managing.full_name || 'Unnamed'}</h2>
                <p className="text-xs text-gray-400 truncate">{managing.email}</p>
              </div>
              <button onClick={() => setManaging(null)} className="text-gray-400 text-2xl leading-none flex-shrink-0">×</button>
            </div>

            <div className="overflow-y-auto px-4 py-4 space-y-5">
              {/* Role */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Role</p>
                  <p className="text-xs text-gray-400">{managing.role === 'admin' ? 'Can manage banks, questions & students' : 'Can only take assigned exams'}</p>
                </div>
                {managing.id === myId ? (
                  <span className="tag bg-gray-100 text-gray-400 text-xs">You</span>
                ) : (
                  <button onClick={toggleRole}
                    className="text-sm font-medium text-brand-600 border border-brand-600 rounded-lg px-3 py-1.5 active:scale-95">
                    {managing.role === 'admin' ? 'Make student' : 'Make admin'}
                  </button>
                )}
              </div>

              {/* Activity */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Activity</p>
                {loadingManage ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : attemptCount === 0 ? (
                  <p className="text-xs text-gray-400">No exam attempts yet.</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">{attemptCount} total attempt{attemptCount !== 1 ? 's' : ''} · recent:</p>
                    {attempts.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-gray-600 truncate">{a.bank_name} · {a.mode}</span>
                        <span className={`font-semibold ${a.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>{a.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank access */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Bank access</p>
                <p className="text-xs text-gray-400 mb-2">Tick the banks this student can use. Banks marked “open to all” are available to everyone automatically.</p>
                {banks.length === 0 ? (
                  <p className="text-xs text-gray-400">No banks created yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {banks.map(b => {
                      const isAssigned = assigned.has(b.id)
                      return (
                        <label key={b.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${b.is_open ? 'border-green-100 bg-green-50' : 'border-gray-100'}`}>
                          <input type="checkbox" className="w-4 h-4 accent-brand-600"
                            checked={b.is_open || isAssigned}
                            disabled={b.is_open || loadingManage}
                            onChange={() => toggleAccess(b.id, isAssigned)} />
                          <span className="flex-1 text-sm text-gray-800">{b.name}</span>
                          {b.is_open && <span className="tag bg-green-100 text-green-700 text-xs">Open to all</span>}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
