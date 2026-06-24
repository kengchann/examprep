'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import type { QuestionBank } from '@/lib/types'

export default function BanksPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('IT')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    // Admin-only page — students are sent back to the dashboard
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') { router.replace('/dashboard'); return }
    const { data } = await supabase.from('question_banks').select('*').order('created_at', { ascending: false })
    setBanks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('question_banks').insert({
      name, description, category, created_by: user?.id, question_count: 0
    })
    if (err) setError(err.message)
    else { setName(''); setDescription(''); setCategory('IT'); setShowForm(false); load() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bank and all its questions?')) return
    await supabase.from('question_banks').delete().eq('id', id)
    load()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Question Banks</h1>
        <p className="text-brand-200 text-sm mt-0.5">Manage your exam collections</p>
      </div>

      <div className="px-4 pt-5">
        {!showForm && <button onClick={() => setShowForm(true)} className="btn-primary mb-4">+ Create new bank</button>}

        {showForm && (
          <form onSubmit={handleCreate} className="card mb-4 space-y-3">
            <h2 className="font-semibold text-gray-800">New question bank</h2>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Bank name</label>
              <input className="input-field" placeholder="e.g. CompTIA Network+" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Description</label>
              <input className="input-field" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Category</label>
              <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="IT">IT Certification</option>
                <option value="Academic">Academic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 bg-brand-600 text-white font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save bank'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl active:scale-95">
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}</div>
        ) : banks.length === 0 ? (
          <div className="card text-center py-10"><p className="text-gray-400 text-sm">No banks yet.</p></div>
        ) : (
          <div className="space-y-3">
            {banks.map(bank => (
              <div key={bank.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{bank.name}</p>
                    {bank.description && <p className="text-sm text-gray-500 mt-0.5">{bank.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="tag bg-brand-50 text-brand-600">{bank.category}</span>
                      <span className="text-xs text-gray-400">{bank.question_count} questions</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(bank.id)} className="text-red-400 px-2 py-1 active:scale-95 ml-2">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
