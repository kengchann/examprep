'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import type { QuestionBank } from '@/lib/types'

const BACKUP_VERSION = 1

export default function BanksPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('IT')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyBank, setBusyBank] = useState<string | null>(null)   // bank id being exported
  const [restoreMsg, setRestoreMsg] = useState('')
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    // Admin-only page — students are sent back to the dashboard
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') { router.replace('/dashboard'); return }
    const { data } = await supabase.from('question_banks').select('*').order('created_at', { ascending: false })
    // Use the REAL question counts (the stored question_count column can drift).
    const { data: counts } = await supabase.from('questions').select('bank_id')
    const countMap: Record<string, number> = {}
    for (const row of counts ?? []) {
      countMap[row.bank_id] = (countMap[row.bank_id] ?? 0) + 1
    }
    setBanks((data || []).map(b => ({ ...b, question_count: countMap[b.id] ?? 0 })))
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

  async function toggleOpen(bank: QuestionBank) {
    const next = !bank.is_open
    setBanks(prev => prev.map(b => b.id === bank.id ? { ...b, is_open: next } : b))   // optimistic
    await supabase.from('question_banks').update({ is_open: next }).eq('id', bank.id)
  }

  // Download a full-fidelity JSON backup of one bank (bank info + all questions).
  async function exportBank(bank: QuestionBank) {
    setBusyBank(bank.id); setRestoreMsg('')
    const { data, error: err } = await supabase
      .from('questions')
      .select('question_text, question_type, options, correct_indices, explanation, topic, image_url, order_index')
      .eq('bank_id', bank.id)
      .order('order_index', { ascending: true })
    setBusyBank(null)
    if (err) { setRestoreMsg(`Export failed: ${err.message}`); return }
    const backup = {
      version: BACKUP_VERSION,
      exported_at: new Date().toISOString(),
      bank: { name: bank.name, description: bank.description, category: bank.category, is_open: bank.is_open },
      questions: data ?? [],
    }
    const safeName = bank.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'bank'
    const stamp = new Date().toISOString().slice(0, 10)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName}-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Restore a backup file into a brand-new bank (never overwrites an existing one).
  async function restoreBank(file: File) {
    setRestoring(true); setRestoreMsg('')
    try {
      const backup = JSON.parse(await file.text())
      const meta = backup?.bank
      const questions = backup?.questions
      if (!meta?.name || !Array.isArray(questions)) {
        throw new Error('This file is not a valid ExamPrep bank backup.')
      }
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newBank, error: bankErr } = await supabase
        .from('question_banks')
        .insert({
          name: `${meta.name} (restored)`,
          description: meta.description || '',
          category: meta.category || 'Other',
          is_open: !!meta.is_open,
          created_by: user?.id,
          question_count: 0,
        })
        .select('id')
        .single()
      if (bankErr || !newBank) throw new Error(bankErr?.message || 'Could not create the bank.')

      const rows = questions.map((q: any, i: number) => ({
        bank_id: newBank.id,
        question_text: q.question_text ?? '',
        question_type: q.question_type ?? 'single',
        options: q.options ?? [],
        correct_indices: q.correct_indices ?? [],
        explanation: q.explanation ?? '',
        topic: q.topic ?? 'General',
        image_url: q.image_url ?? null,
        order_index: q.order_index ?? i + 1,
      }))
      // Insert in chunks so large banks don't hit request-size limits.
      for (let i = 0; i < rows.length; i += 500) {
        const { error: qErr } = await supabase.from('questions').insert(rows.slice(i, i + 500))
        if (qErr) throw new Error(`Imported the bank but a batch of questions failed: ${qErr.message}`)
      }
      setRestoreMsg(`✅ Restored "${meta.name}" with ${rows.length} question${rows.length !== 1 ? 's' : ''}.`)
      load()
    } catch (e) {
      setRestoreMsg(`❌ ${e instanceof Error ? e.message : 'Restore failed.'}`)
    } finally {
      setRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Question Banks</h1>
        <p className="text-brand-200 text-sm mt-0.5">Manage your exam collections</p>
      </div>

      <div className="px-4 pt-5">
        {!showForm && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowForm(true)} className="btn-primary flex-1 mb-0">+ Create new bank</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={restoring}
              className="border border-brand-600 text-brand-600 font-medium px-4 rounded-xl active:scale-95 disabled:opacity-50 whitespace-nowrap">
              {restoring ? 'Restoring…' : '⬆ Restore'}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) restoreBank(f) }} />
          </div>
        )}
        {restoreMsg && <p className="text-sm mb-4 text-gray-600 break-words">{restoreMsg}</p>}

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
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => exportBank(bank)} disabled={busyBank === bank.id}
                      className="text-xs text-brand-600 border border-brand-200 px-2 py-1 rounded-lg active:scale-95 disabled:opacity-50 whitespace-nowrap">
                      {busyBank === bank.id ? '…' : '⬇ Backup'}
                    </button>
                    <button onClick={() => handleDelete(bank.id)} className="text-red-400 px-2 py-1 active:scale-95">🗑</button>
                  </div>
                </div>
                <label className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-50 cursor-pointer">
                  <div>
                    <span className="text-sm text-gray-700">Open to all students</span>
                    <p className="text-xs text-gray-400">{bank.is_open ? 'Every student can take this exam' : 'Only students you assign can take this exam'}</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-brand-600 flex-shrink-0"
                    checked={bank.is_open} onChange={() => toggleOpen(bank)} />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
