'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import type { Question, QuestionBank, QuestionType } from '@/lib/types'
import { parseQuestionCSV, CSV_TEMPLATE, type ParsedCSVRow } from '@/lib/csv'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function QuestionsPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [selectedBank, setSelectedBank] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // CSV import state
  const [importRows, setImportRows] = useState<ParsedCSVRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [qType, setQType] = useState<QuestionType>('single')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndices, setCorrectIndices] = useState<number[]>([0])
  const [explanation, setExplanation] = useState('')
  const [topic, setTopic] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      // Admin-only page — students are sent back to the dashboard
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }
      const { data } = await supabase
        .from('question_banks')
        .select('id, name, description, category, created_by, created_at')
        .order('name')
      if (!data) { setBanks([]); return }

      // Get real question counts from questions table
      const { data: counts } = await supabase
        .from('questions')
        .select('bank_id')
      const countMap: Record<string, number> = {}
      for (const row of counts ?? []) {
        countMap[row.bank_id] = (countMap[row.bank_id] ?? 0) + 1
      }
      const banksWithCount = data.map(b => ({ ...b, question_count: countMap[b.id] ?? 0 }))
      setBanks(banksWithCount as QuestionBank[])
      if (data.length > 0) setSelectedBank(data[0].id)
    }
    init()
  }, [])

  useEffect(() => { if (selectedBank) loadQuestions() }, [selectedBank])

  async function loadQuestions() {
    setLoading(true)
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', selectedBank)
      .order('order_index', { ascending: true })
    setQuestions((data as Question[]) || [])
    setLoading(false)
  }

  function toggleCorrect(i: number) {
    if (qType === 'single' || qType === 'truefalse') {
      setCorrectIndices([i])
    } else {
      setCorrectIndices(prev =>
        prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
      )
    }
  }

  function resetForm() {
    setQuestionText(''); setOptions(['', '', '', '']); setCorrectIndices([0])
    setExplanation(''); setTopic(''); setQType('single'); setError('')
    setImageUrl(null); setEditingQuestion(null)
  }

  function openEditForm(q: Question) {
    setEditingQuestion(q)
    setQType(q.question_type)
    setQuestionText(q.question_text)
    setOptions(q.question_type === 'truefalse' ? ['', '', '', ''] : [...q.options, ...Array(4)].slice(0, 4).map(o => o ?? ''))
    setCorrectIndices([...q.correct_indices])
    setExplanation(q.explanation ?? '')
    setTopic(q.topic ?? '')
    setImageUrl(q.image_url ?? null)
    setError('')
    setShowForm(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setUploadingImage(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `${selectedBank}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('question-images').upload(path, file)
    if (upErr) {
      setError(`Image upload failed: ${upErr.message}`)
    } else {
      const { data } = supabase.storage.from('question-images').getPublicUrl(path)
      setImageUrl(data.publicUrl)
    }
    setUploadingImage(false)
    e.target.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const activeOptions = qType === 'truefalse' ? ['True', 'False'] : options
    if (qType !== 'truefalse' && activeOptions.some(o => !o.trim())) {
      setError('Fill in all 4 answer options.'); return
    }
    if (correctIndices.length === 0) { setError('Select at least one correct answer.'); return }
    setSaving(true); setError('')

    if (editingQuestion) {
      const { error: err } = await supabase.from('questions').update({
        question_text: questionText,
        question_type: qType,
        options: activeOptions,
        correct_indices: correctIndices,
        explanation,
        topic: topic || 'General',
        image_url: imageUrl,
      }).eq('id', editingQuestion.id)

      if (err) { setError(err.message) }
      else { resetForm(); setShowForm(false); loadQuestions() }
    } else {
      const { data: existing } = await supabase.from('questions')
        .select('order_index').eq('bank_id', selectedBank).order('order_index', { ascending: false }).limit(1)
      const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 1

      const { error: err } = await supabase.from('questions').insert({
        bank_id: selectedBank,
        question_text: questionText,
        question_type: qType,
        options: activeOptions,
        correct_indices: correctIndices,
        explanation,
        topic: topic || 'General',
        image_url: imageUrl,
        order_index: nextIndex,
      })

      if (err) { setError(err.message) }
      else {
        await supabase.rpc('increment_question_count', { bank_id_param: selectedBank })
        resetForm(); setShowForm(false); loadQuestions()
      }
    }
    setSaving(false)
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseQuestionCSV(String(reader.result || ''))
      setImportRows(parsed)
    }
    reader.readAsText(file)
    e.target.value = ''   // allow re-selecting the same file
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'examprep-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function confirmImport() {
    if (!importRows) return
    const valid = importRows.filter(r => !r.error)
    if (valid.length === 0) return
    setImporting(true)

    const { data: existing } = await supabase.from('questions')
      .select('order_index').eq('bank_id', selectedBank).order('order_index', { ascending: false }).limit(1)
    let nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 1

    const payload = valid.map(r => ({
      bank_id: selectedBank,
      question_text: r.question_text,
      question_type: r.question_type,
      options: r.options,
      correct_indices: r.correct_indices,
      explanation: r.explanation,
      topic: r.topic || 'General',
      order_index: nextIndex++,
    }))

    const { error: err } = await supabase.from('questions').insert(payload)
    if (err) {
      setError(err.message)
    } else {
      setBanks(prev => prev.map(b => b.id === selectedBank
        ? { ...b, question_count: b.question_count + valid.length } : b))
      setImportRows(null)
      loadQuestions()
    }
    setImporting(false)
  }

  async function handleDelete(q: Question) {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', q.id)
    await supabase.rpc('decrement_question_count', { bank_id_param: selectedBank })
    loadQuestions()
  }

  const tfOptions = ['True', 'False']

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Questions</h1>
        <p className="text-brand-200 text-sm mt-0.5">Add and manage exam questions</p>
      </div>

      <div className="px-4 pt-4">
        {banks.length > 0 && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 block mb-1">Question bank</label>
            <select className="input-field" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.question_count} Qs)</option>)}
            </select>
          </div>
        )}

        {banks.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-gray-500 text-sm">Create a bank first in the Banks tab</p>
          </div>
        ) : (
          <>
            {!showForm && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary flex-1">
                  + Add question
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 border border-brand-600 text-brand-600 font-medium rounded-xl active:scale-95"
                  title="Import questions from CSV"
                >
                  ⬆ CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
              </div>
            )}
            {!showForm && (
              <button onClick={downloadTemplate} className="text-xs text-gray-400 -mt-2 mb-4 active:scale-95">
                Need the format? Download CSV template
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSave} className="card mb-4 space-y-4">
                <h2 className="font-semibold text-gray-800">
                  {editingQuestion ? `Edit Q${questions.findIndex(q => q.id === editingQuestion.id) + 1}` : 'New question'}
                </h2>

                {/* Question type */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Question type</label>
                  <div className="flex gap-2">
                    {([['single','Single'], ['multiple','Multiple'], ['truefalse','True/False']] as [QuestionType, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => { setQType(val); setCorrectIndices([0]) }}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${qType === val ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {qType === 'multiple' && <p className="text-xs text-brand-600 mt-1">Tap multiple letters to mark all correct answers</p>}
                </div>

                {/* Question text */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Question</label>
                  <textarea className="input-field resize-y" rows={5} placeholder={"Type your question here…\n\nPress Enter for line breaks — they're kept exactly as you type them."}
                    value={questionText} onChange={e => setQuestionText(e.target.value)} required />
                  <p className="text-xs text-gray-400 mt-1">Line breaks and indentation are preserved (good for code or config snippets).</p>
                </div>

                {/* Image / exhibit */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Image / exhibit (optional)</label>
                  {imageUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Question exhibit" className="w-full rounded-xl border border-gray-100" />
                      <button type="button" onClick={() => setImageUrl(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg active:scale-95">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-500 cursor-pointer active:scale-95">
                      {uploadingImage ? 'Uploading…' : '🖼️ Tap to add an image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 block">
                    {qType === 'truefalse' ? 'Correct answer' : 'Answer options'}
                  </label>
                  {(qType === 'truefalse' ? tfOptions : options).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleCorrect(i)}
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          correctIndices.includes(i)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 text-gray-400'
                        }`}>
                        {qType === 'truefalse' ? (i === 0 ? 'T' : 'F') : OPTION_LABELS[i]}
                      </button>
                      {qType === 'truefalse' ? (
                        <span className="text-sm text-gray-700 font-medium">{opt}</span>
                      ) : (
                        <input className="input-field" placeholder={`Option ${OPTION_LABELS[i]}`}
                          value={opt} onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o) }} />
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-gray-400">Tap the letter/circle to mark the correct answer(s)</p>
                </div>

                {/* Topic */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Topic / Domain (optional)</label>
                  <input className="input-field" placeholder="e.g. Networking, Security, OSI Model"
                    value={topic} onChange={e => setTopic(e.target.value)} />
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Explanation (optional)</label>
                  <textarea className="input-field resize-none" rows={2}
                    placeholder="Why is this answer correct?"
                    value={explanation} onChange={e => setExplanation(e.target.value)} />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-brand-600 text-white font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50">
                    {saving ? 'Saving…' : editingQuestion ? 'Update question' : 'Save question'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                    className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl active:scale-95">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Questions list */}
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}</div>
            ) : questions.length === 0 ? (
              <div className="card text-center py-8"><p className="text-gray-400 text-sm">No questions yet.</p></div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="card">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-brand-600">Q{idx + 1}</span>
                          <span className={`tag text-xs ${
                            q.question_type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                            q.question_type === 'truefalse' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {q.question_type === 'multiple' ? 'Multi' : q.question_type === 'truefalse' ? 'T/F' : 'Single'}
                          </span>
                          {q.topic && <span className="tag bg-green-50 text-green-700">{q.topic}</span>}
                          {q.image_url && <span className="tag bg-amber-50 text-amber-700">🖼️</span>}
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{q.question_text}</p>
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {q.correct_indices.map(i => q.options[i]).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditForm(q)}
                          className="text-brand-600 px-1 py-1 active:scale-95"
                          title="Edit question"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(q)}
                          className="text-red-400 px-1 py-1 active:scale-95"
                          title="Delete question"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CSV import preview modal */}
      {importRows && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end" onClick={() => !importing && setImportRows(null)}>
          <div className="bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Import preview</h3>
              <button onClick={() => !importing && setImportRows(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            {(() => {
              const valid = importRows.filter(r => !r.error)
              const invalid = importRows.filter(r => r.error)
              return (
                <>
                  <div className="flex gap-2 mb-3 text-sm">
                    <span className="tag bg-green-50 text-green-700">{valid.length} ready</span>
                    {invalid.length > 0 && <span className="tag bg-red-50 text-red-600">{invalid.length} with errors</span>}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {importRows.map((r, i) => (
                      <div key={i} className={`rounded-xl border px-3 py-2 ${r.error ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-400">Row {r.rowNumber}</span>
                          <span className="tag text-xs bg-gray-100 text-gray-600">{r.question_type}</span>
                          {!r.error && <span className="text-xs text-green-600">✓ {r.correct_indices.map(ix => OPTION_LABELS[ix] || ix + 1).join(', ')}</span>}
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-2">{r.question_text || <span className="italic text-gray-400">(empty)</span>}</p>
                        {r.error && <p className="text-xs text-red-600 mt-0.5">⚠ {r.error} — skipped</p>}
                      </div>
                    ))}
                  </div>

                  {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={confirmImport}
                      disabled={importing || valid.length === 0}
                      className="flex-1 bg-brand-600 text-white font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50"
                    >
                      {importing ? 'Importing…' : `Import ${valid.length} question${valid.length !== 1 ? 's' : ''}`}
                    </button>
                    <button
                      onClick={() => setImportRows(null)}
                      disabled={importing}
                      className="px-5 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                  <button onClick={downloadTemplate} className="w-full text-center text-xs text-brand-600 mt-3 active:scale-95">
                    Download CSV template
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
