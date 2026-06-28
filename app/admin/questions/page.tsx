'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import type { Question, QuestionBank, QuestionType } from '@/lib/types'
import { parseQuestionCSV, CSV_TEMPLATE, type ParsedCSVRow } from '@/lib/csv'
import { classifyTopic } from '@/lib/topics'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const MAX_OPTIONS = 8
const PAGE_SIZE = 50

// Normalise text for duplicate comparison: trim, lowercase, collapse whitespace
const normText = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

type DupGroup = { text: string; items: { id: string; order_index: number; question_text: string }[] }

type BulkItem = {
  fileName: string
  qNum: number | null          // question number parsed from the filename
  answerFromFile: boolean       // true if the correct answer came from the filename
  status: 'pending' | 'done' | 'error'
  error?: string
  question_text: string
  question_type: QuestionType
  options: string[]
  correct_indices: number[]
  explanation: string
  topic: string
}

// Parse a filename like "124bc" → { num: 124, answer: [1,2] } (a=0,b=1,…).
// Tolerates separators/extension: "124 bc.png", "124_b-c", "124".
function parseFilenameMeta(name: string): { num: number | null; answer: number[] | null } {
  const base = name.replace(/\.[^.]+$/, '').trim()
  const m = base.match(/^(\d+)[\s._-]*([a-hA-H]*)$/)
  if (!m) {
    const numOnly = base.match(/^(\d+)/)
    return { num: numOnly ? parseInt(numOnly[1], 10) : null, answer: null }
  }
  const num = parseInt(m[1], 10)
  const letters = m[2].toLowerCase()
  const answer = letters
    ? Array.from(new Set(letters.split('').map(c => c.charCodeAt(0) - 97))).sort((a, b) => a - b)
    : null
  return { num, answer }
}

export default function QuestionsPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [selectedBank, setSelectedBank] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // Search
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')

  // Duplicate handling
  const [duplicateOf, setDuplicateOf] = useState<{ order_index: number; question_text: string } | null>(null)
  const [dupGroups, setDupGroups] = useState<DupGroup[] | null>(null)
  const [scanningDups, setScanningDups] = useState(false)

  // Auto-tag topics
  const [tagging, setTagging] = useState(false)
  const [tagProgress, setTagProgress] = useState(0)
  const [tagTotal, setTagTotal] = useState(0)
  const [tagSummary, setTagSummary] = useState<Record<string, number> | null>(null)

  // CSV import state
  const [importRows, setImportRows] = useState<ParsedCSVRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Screenshot extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractNote, setExtractNote] = useState('')
  const screenshotInputRef = useRef<HTMLInputElement>(null)

  // Bulk screenshot import state
  const [bulkItems, setBulkItems] = useState<BulkItem[] | null>(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)
  const bulkInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [qType, setQType] = useState<QuestionType>('single')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndices, setCorrectIndices] = useState<number[]>([])
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

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setActiveSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { if (selectedBank) loadQuestions(true) }, [selectedBank, activeSearch])

  // reset=true reloads the first page; reset=false appends the next page
  async function loadQuestions(reset: boolean) {
    if (reset) setLoading(true); else setLoadingMore(true)
    const from = reset ? 0 : questions.length
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from('questions')
      .select('*', { count: 'exact' })
      .eq('bank_id', selectedBank)
    const trimmed = activeSearch.trim()
    const numMatch = trimmed.match(/^q?\s*(\d+)$/i)   // "Q99", "q 99", or "99" → search by number
    if (numMatch) query = query.eq('order_index', parseInt(numMatch[1], 10))
    else if (trimmed) query = query.ilike('question_text', `%${trimmed}%`)
    const { data, count } = await query.order('order_index', { ascending: true }).range(from, to)
    const rows = (data as Question[]) || []
    setQuestions(prev => (reset ? rows : [...prev, ...rows]))
    setTotalCount(count ?? 0)
    setLoading(false); setLoadingMore(false)
  }

  const searching = activeSearch.trim().length > 0
  const hasMore = questions.length < totalCount

  function toggleCorrect(i: number) {
    if (qType === 'single' || qType === 'truefalse') {
      setCorrectIndices([i])
    } else {
      setCorrectIndices(prev =>
        prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
      )
    }
  }

  function addOption() {
    setOptions(prev => prev.length < MAX_OPTIONS ? [...prev, ''] : prev)
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, idx) => idx !== i))
    // Drop this index from correct answers and shift higher indices down
    setCorrectIndices(prev => prev.filter(x => x !== i).map(x => (x > i ? x - 1 : x)))
  }

  function resetForm() {
    setQuestionText(''); setOptions(['', '', '', '']); setCorrectIndices([])
    setExplanation(''); setTopic(''); setQType('single'); setError('')
    setImageUrl(null); setEditingQuestion(null); setExtractNote('')
  }

  function openEditForm(q: Question) {
    setEditingQuestion(q)
    setQType(q.question_type)
    setQuestionText(q.question_text)
    setOptions(q.question_type === 'truefalse' ? ['', '', '', ''] : q.options.map(o => o ?? ''))
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

  function buildActiveOptions() {
    return qType === 'truefalse' ? ['True', 'False'] : options.map(o => o.trim())
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const activeOptions = buildActiveOptions()
    if (qType !== 'truefalse') {
      if (activeOptions.length < 2) { setError('Add at least 2 answer options.'); return }
      if (activeOptions.some(o => !o)) { setError('Fill in every answer option, or remove the empty ones.'); return }
    }
    if (correctIndices.length === 0) { setError('Select at least one correct answer.'); return }
    setError('')

    // Duplicate guard — warn if an identical question already exists in this bank
    setSaving(true)
    let dq = supabase.from('questions')
      .select('order_index, question_text')
      .eq('bank_id', selectedBank)
      .eq('question_text', questionText.trim())
      .limit(1)
    if (editingQuestion) dq = dq.neq('id', editingQuestion.id)
    const { data: dups } = await dq
    setSaving(false)
    if (dups && dups.length > 0) { setDuplicateOf(dups[0] as { order_index: number; question_text: string }); return }

    await doSave()
  }

  // Performs the actual insert/update (called after the duplicate check, or on "Save anyway")
  async function doSave() {
    setSaving(true); setError(''); setDuplicateOf(null)
    const activeOptions = buildActiveOptions()

    if (editingQuestion) {
      const { error: err } = await supabase.from('questions').update({
        question_text: questionText.trim(),
        question_type: qType,
        options: activeOptions,
        correct_indices: correctIndices,
        explanation,
        topic: topic || 'General',
        image_url: imageUrl,
      }).eq('id', editingQuestion.id)

      if (err) { setError(err.message) }
      else { resetForm(); setShowForm(false); loadQuestions(true) }
    } else {
      const { data: existing } = await supabase.from('questions')
        .select('order_index').eq('bank_id', selectedBank).order('order_index', { ascending: false }).limit(1)
      const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 1

      const { error: err } = await supabase.from('questions').insert({
        bank_id: selectedBank,
        question_text: questionText.trim(),
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
        setBanks(prev => prev.map(b => b.id === selectedBank ? { ...b, question_count: b.question_count + 1 } : b))
        resetForm(); setShowForm(false); loadQuestions(true)
      }
    }
    setSaving(false)
  }

  async function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Screenshot must be under 5 MB.'); return }

    setExtracting(true); setError(''); setExtractNote('')
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1]

      const res = await fetch('/api/extract-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not extract the question.'); return }

      // Pre-fill the form for the admin to verify
      const type = (data.question_type as QuestionType) || 'single'
      setQType(type)
      setQuestionText(data.question_text || '')
      if (type !== 'truefalse') {
        const opts = Array.isArray(data.options) ? data.options.map((o: string) => o ?? '') : []
        setOptions(opts.length >= 2 ? opts.slice(0, MAX_OPTIONS) : [...opts, '', ''].slice(0, 4))
      }
      setCorrectIndices(Array.isArray(data.correct_indices) ? data.correct_indices : [])
      setExplanation(data.explanation || '')
      setTopic(data.topic || '')
      setExtractNote(
        (Array.isArray(data.correct_indices) && data.correct_indices.length > 0)
          ? 'Extracted. Double-check everything — especially the correct answer.'
          : 'Extracted. The answer wasn’t in the image — tap the correct option(s) before saving.'
      )
    } catch {
      setError('Could not read that screenshot. Try again.')
    } finally {
      setExtracting(false)
    }
  }

  async function fileToBase64(file: File): Promise<string> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return dataUrl.split(',')[1]
  }

  async function handleBulkSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    // Sort by the number in the filename so they import in the right order (121 before 1199)
    const withMeta = files.map(f => ({ file: f, meta: parseFilenameMeta(f.name) }))
    withMeta.sort((a, b) => {
      if (a.meta.num != null && b.meta.num != null) return a.meta.num - b.meta.num
      if (a.meta.num != null) return -1
      if (b.meta.num != null) return 1
      return a.file.name.localeCompare(b.file.name)
    })

    const items: BulkItem[] = withMeta.map(({ file, meta }) => ({
      fileName: file.name, qNum: meta.num, answerFromFile: false, status: 'pending',
      question_text: '', question_type: 'single', options: [], correct_indices: [], explanation: '', topic: '',
    }))
    setBulkItems(items)
    setBulkProcessing(true)

    // Process sequentially to stay within API rate limits
    for (let i = 0; i < withMeta.length; i++) {
      const { file, meta } = withMeta[i]
      try {
        const base64 = await fileToBase64(file)
        const res = await fetch('/api/extract-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType: file.type }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Extract failed')

        const aiType = (data.question_type as QuestionType) || 'single'
        // Filename answer (e.g. "124bc") wins over the AI's guess when present
        let qtype = aiType
        let correct = Array.isArray(data.correct_indices) ? data.correct_indices : []
        let answerFromFile = false
        if (meta.answer && meta.answer.length > 0) {
          correct = meta.answer
          answerFromFile = true
          if (meta.answer.length > 1) qtype = 'multiple'
          else if (aiType !== 'truefalse') qtype = 'single'
        }

        setBulkItems(prev => prev && prev.map((it, idx) => idx === i ? {
          ...it, status: 'done',
          question_text: data.question_text || '',
          question_type: qtype,
          options: Array.isArray(data.options) ? data.options : [],
          correct_indices: correct,
          explanation: data.explanation || '',
          topic: data.topic || 'General',
          answerFromFile,
        } : it))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed'
        setBulkItems(prev => prev && prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: msg } : it))
      }
    }
    setBulkProcessing(false)
  }

  function toggleBulkCorrect(itemIdx: number, optIdx: number) {
    setBulkItems(prev => prev && prev.map((it, idx) => {
      if (idx !== itemIdx) return it
      const single = it.question_type === 'single' || it.question_type === 'truefalse'
      const has = it.correct_indices.includes(optIdx)
      const next = single ? [optIdx] : has ? it.correct_indices.filter(x => x !== optIdx) : [...it.correct_indices, optIdx]
      return { ...it, correct_indices: next.sort((a, b) => a - b) }
    }))
  }

  const bulkValid = (it: BulkItem) => {
    if (it.status !== 'done' || it.question_text.trim() === '') return false
    const optCount = it.question_type === 'truefalse' ? 2 : it.options.length
    if (optCount < 2) return false
    if (it.correct_indices.length === 0) return false
    return it.correct_indices.every(ci => ci >= 0 && ci < optCount)   // answer must point to a real option
  }

  async function confirmBulkImport() {
    if (!bulkItems) return
    const valid = bulkItems.filter(bulkValid)
    if (valid.length === 0) return
    setBulkImporting(true)

    const { data: existing } = await supabase.from('questions')
      .select('order_index').eq('bank_id', selectedBank).order('order_index', { ascending: false }).limit(1)
    let nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 1

    // Use the number from the filename as the question position when present; otherwise continue sequentially
    const payload = valid.map(it => ({
      bank_id: selectedBank,
      question_text: it.question_text.trim(),
      question_type: it.question_type,
      options: it.question_type === 'truefalse' ? ['True', 'False'] : it.options,
      correct_indices: it.correct_indices,
      explanation: it.explanation,
      topic: it.topic || 'General',
      order_index: it.qNum != null ? it.qNum : nextIndex++,
    }))

    const { error: err } = await supabase.from('questions').insert(payload)
    if (err) {
      setError(err.message)
    } else {
      setBanks(prev => prev.map(b => b.id === selectedBank ? { ...b, question_count: b.question_count + valid.length } : b))
      setBulkItems(null)
      loadQuestions(true)
    }
    setBulkImporting(false)
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
      loadQuestions(true)
    }
    setImporting(false)
  }

  async function handleDelete(q: Question) {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', q.id)
    await supabase.rpc('decrement_question_count', { bank_id_param: selectedBank })
    setBanks(prev => prev.map(b => b.id === selectedBank ? { ...b, question_count: Math.max(0, b.question_count - 1) } : b))
    loadQuestions(true)
  }

  // Swap a question with its neighbour (up = -1, down = +1). Only within the loaded list.
  async function moveQuestion(index: number, dir: -1 | 1) {
    if (searching) return
    const target = index + dir
    if (target < 0 || target >= questions.length) return
    const a = questions[index], b = questions[target]
    // Optimistic swap — also swap the displayed order_index so numbers stay in order
    const arr = [...questions]
    arr[index] = { ...b, order_index: a.order_index }
    arr[target] = { ...a, order_index: b.order_index }
    setQuestions(arr)
    await supabase.from('questions').update({ order_index: b.order_index }).eq('id', a.id)
    await supabase.from('questions').update({ order_index: a.order_index }).eq('id', b.id)
  }

  // Move a question to an arbitrary position (1..N), renumbering the affected range
  async function moveToPosition(q: Question) {
    if (searching) return
    const input = window.prompt(`Move this question to which position? (1–${totalCount})`, String(q.order_index))
    if (input === null) return
    const target = parseInt(input, 10)
    if (!target || target < 1 || target > totalCount) { alert('Please enter a valid position number.'); return }

    const { data } = await supabase.from('questions')
      .select('id, order_index').eq('bank_id', selectedBank).order('order_index', { ascending: true })
    const list = (data || []) as { id: string; order_index: number }[]
    const fromIdx = list.findIndex(r => r.id === q.id)
    if (fromIdx === -1) return
    const [moved] = list.splice(fromIdx, 1)
    list.splice(target - 1, 0, moved)
    // Normalize to 1..N, persist only the rows whose number changed
    await Promise.all(
      list
        .map((r, i) => (r.order_index !== i + 1 ? { id: r.id, ni: i + 1 } : null))
        .filter((x): x is { id: string; ni: number } => x !== null)
        .map(u => supabase.from('questions').update({ order_index: u.ni }).eq('id', u.id))
    )
    loadQuestions(true)
  }

  // Scan the whole bank for duplicate question text (normalized)
  async function findDuplicates() {
    setScanningDups(true)
    const { data } = await supabase.from('questions')
      .select('id, order_index, question_text').eq('bank_id', selectedBank).order('order_index', { ascending: true })
    const map = new Map<string, { id: string; order_index: number; question_text: string }[]>()
    for (const r of (data || []) as { id: string; order_index: number; question_text: string }[]) {
      const k = normText(r.question_text)
      if (!k) continue
      const arr = map.get(k) || []
      arr.push(r); map.set(k, arr)
    }
    const groups: DupGroup[] = []
    map.forEach((items, text) => { if (items.length > 1) groups.push({ text, items }) })
    setDupGroups(groups)
    setScanningDups(false)
  }

  // Classify every question in the bank into clustered topics and save them.
  // Groups by topic and updates in chunks (a few requests, not 911).
  async function autoTagTopics() {
    if (!selectedBank) return
    if (!confirm('Auto-tag every question in this bank into clustered topics?\nThis overwrites the current topics.')) return
    setTagging(true); setTagSummary(null); setTagProgress(0)
    const { data, error } = await supabase.from('questions')
      .select('id, question_text, options').eq('bank_id', selectedBank)
    if (error || !data) { alert('Could not load questions: ' + (error?.message || '')); setTagging(false); return }

    setTagTotal(data.length)
    const groups = new Map<string, string[]>()
    for (const q of data as { id: string; question_text: string; options: string[] }[]) {
      const t = classifyTopic(q.question_text, q.options || [])
      const arr = groups.get(t) || []
      arr.push(q.id); groups.set(t, arr)
    }

    let done = 0
    const summary: Record<string, number> = {}
    for (const t of Array.from(groups.keys())) {
      const ids = groups.get(t)!
      summary[t] = ids.length
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200)
        const { error: uerr } = await supabase.from('questions').update({ topic: t }).in('id', chunk)
        if (uerr) { alert('Update failed: ' + uerr.message); setTagging(false); return }
        done += chunk.length
        setTagProgress(done)
      }
    }
    setTagSummary(summary)
    setTagging(false)
    loadQuestions(true)
  }

  async function deleteFromScanner(id: string) {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    await supabase.rpc('decrement_question_count', { bank_id_param: selectedBank })
    setBanks(prev => prev.map(b => b.id === selectedBank ? { ...b, question_count: Math.max(0, b.question_count - 1) } : b))
    await findDuplicates()
    loadQuestions(true)
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
                <button
                  onClick={() => bulkInputRef.current?.click()}
                  className="px-4 border border-brand-600 text-brand-600 font-medium rounded-xl active:scale-95"
                  title="Bulk import from screenshots (AI)"
                >
                  📷
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
                <input ref={bulkInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBulkSelect} />
              </div>
            )}
            {!showForm && (
              <button onClick={downloadTemplate} className="text-xs text-gray-400 -mt-2 mb-3 active:scale-95 block">
                Need the format? Download CSV template
              </button>
            )}

            {/* Search + duplicate scanner */}
            {!showForm && (
              <div className="mb-3 space-y-2">
                <div className="relative">
                  <input
                    className="input-field pr-9"
                    placeholder="🔍 Search text or number (e.g. Q99)…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none">×</button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={findDuplicates} disabled={scanningDups}
                    className="text-xs font-medium text-brand-600 active:scale-95 disabled:opacity-50">
                    {scanningDups ? 'Scanning…' : '🔁 Find duplicate questions'}
                  </button>
                  <button onClick={autoTagTopics} disabled={tagging}
                    className="text-xs font-medium text-brand-600 active:scale-95 disabled:opacity-50">
                    {tagging ? `Tagging… ${tagProgress}/${tagTotal}` : '🏷️ Auto-tag topics'}
                  </button>
                </div>
                {tagSummary && (
                  <div className="card bg-brand-50 border-brand-100">
                    <p className="text-xs font-semibold text-brand-700 mb-1">Topics tagged ✓</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(tagSummary).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                        <span key={t} className="tag bg-white text-gray-600 text-xs border border-gray-200">{t}: {n}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showForm && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col justify-end" onClick={() => { setShowForm(false); resetForm() }}>
                <div className="bg-white rounded-t-3xl max-h-[90vh] w-full flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <h2 className="font-semibold text-gray-800">
                      {editingQuestion ? `Edit Q${editingQuestion.order_index}` : 'New question'}
                    </h2>
                    <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                      className="text-gray-400 text-2xl leading-none active:scale-95">×</button>
                  </div>
                  <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {/* Extract from screenshot */}
                {!editingQuestion && (
                  <div>
                    <button type="button" onClick={() => screenshotInputRef.current?.click()} disabled={extracting}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-300 text-brand-600 font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50">
                      {extracting ? 'Reading screenshot…' : '📷 Fill from a screenshot (AI)'}
                    </button>
                    <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                    {extractNote && <p className="text-xs text-amber-600 mt-1.5">⚠️ {extractNote}</p>}
                  </div>
                )}

                {/* Question type */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-2">Question type</label>
                  <div className="flex gap-2">
                    {([['single','Single'], ['multiple','Multiple'], ['truefalse','True/False']] as [QuestionType, string][]).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => { setQType(val); setCorrectIndices([]) }}
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
                        <>
                          <input className="input-field" placeholder={`Option ${OPTION_LABELS[i]}`}
                            value={opt} onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o) }} />
                          {options.length > 2 && (
                            <button type="button" onClick={() => removeOption(i)}
                              className="text-gray-300 text-lg px-1 active:scale-95 flex-shrink-0" title="Remove option">
                              ✕
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {qType !== 'truefalse' && options.length < MAX_OPTIONS && (
                    <button type="button" onClick={addOption}
                      className="text-sm font-medium text-brand-600 active:scale-95">
                      + Add option
                    </button>
                  )}
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
                  </div>

                  <div className="flex gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
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
                </div>
              </div>
            )}

            {/* Count line */}
            {!showForm && !loading && totalCount > 0 && (
              <p className="text-xs text-gray-400 mb-2">
                {searching
                  ? `${totalCount} match${totalCount !== 1 ? 'es' : ''} for “${activeSearch.trim()}”`
                  : `${totalCount} question${totalCount !== 1 ? 's' : ''} in this bank`}
              </p>
            )}

            {/* Questions list */}
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}</div>
            ) : questions.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-gray-400 text-sm">{searching ? 'No questions match your search.' : 'No questions yet.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="card">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => moveToPosition(q)}
                            disabled={searching}
                            className="text-xs font-bold text-brand-600 active:scale-95 disabled:opacity-60"
                            title={searching ? '' : 'Tap to move to a position'}
                          >
                            Q{q.order_index}
                          </button>
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
                          ✓ {q.correct_indices.map(i => `${OPTION_LABELS[i] ?? i + 1}. ${q.options[i]}`).join('   ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!searching && (
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveQuestion(idx, -1)}
                              disabled={idx === 0}
                              className="text-gray-400 leading-none px-1 active:scale-95 disabled:opacity-20"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveQuestion(idx, 1)}
                              disabled={idx === questions.length - 1}
                              className="text-gray-400 leading-none px-1 active:scale-95 disabled:opacity-20"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
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

                {hasMore && (
                  <button
                    onClick={() => loadQuestions(false)}
                    disabled={loadingMore}
                    className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : `Load more (${questions.length} of ${totalCount})`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* CSV import preview modal */}
      {importRows && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col justify-end" onClick={() => !importing && setImportRows(null)}>
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

      {/* Floating Add button — always reachable without scrolling up */}
      {banks.length > 0 && !showForm && !importRows && !dupGroups && (
        <button
          onClick={() => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-brand-600 text-white text-3xl shadow-lg flex items-center justify-center active:scale-95"
          title="Add question"
          aria-label="Add question"
        >
          +
        </button>
      )}

      {/* Bulk screenshot import */}
      {bulkItems && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col justify-end" onClick={() => !bulkProcessing && !bulkImporting && setBulkItems(null)}>
          <div className="bg-white rounded-t-3xl max-h-[90vh] w-full flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-800">Screenshot import</h2>
                <p className="text-xs text-gray-400">
                  {bulkProcessing
                    ? `Reading ${bulkItems.filter(i => i.status !== 'pending').length}/${bulkItems.length}…`
                    : `${bulkItems.filter(bulkValid).length} ready · ${bulkItems.length} total`}
                </p>
              </div>
              <button onClick={() => !bulkProcessing && !bulkImporting && setBulkItems(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {bulkProcessing && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-brand-600 transition-all"
                    style={{ width: `${(bulkItems.filter(i => i.status !== 'pending').length / bulkItems.length) * 100}%` }} />
                </div>
              )}
              {bulkItems.map((it, i) => {
                const tf = it.question_type === 'truefalse'
                const opts = tf ? ['True', 'False'] : it.options
                const valid = bulkValid(it)
                return (
                  <div key={i} className={`rounded-xl border px-3 py-2 ${
                    it.status === 'error' ? 'border-red-200 bg-red-50' :
                    it.status === 'pending' ? 'border-gray-100 opacity-60' :
                    valid ? 'border-gray-100' : 'border-amber-200 bg-amber-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {it.qNum != null && <span className="text-xs font-bold text-brand-600 flex-shrink-0">Q{it.qNum}</span>}
                      <span className="text-xs text-gray-400 truncate flex-1">{it.fileName}</span>
                      {it.status === 'pending' && <span className="text-xs text-gray-400">⏳</span>}
                      {it.status === 'error' && <span className="text-xs text-red-500">⚠ {it.error}</span>}
                      {it.status === 'done' && !valid && <span className="text-xs text-amber-600">needs answer</span>}
                      {it.status === 'done' && valid && (
                        <span className="text-xs text-green-600">✓ {it.answerFromFile ? 'from filename' : 'ready'}</span>
                      )}
                    </div>
                    {it.status === 'done' && (
                      <>
                        <p className="text-sm text-gray-800 line-clamp-2 mb-1.5">{it.question_text || <span className="italic text-gray-400">(no text)</span>}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {opts.map((opt, oi) => (
                            <button key={oi} onClick={() => toggleBulkCorrect(i, oi)}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-all ${
                                it.correct_indices.includes(oi) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-600'
                              }`}>
                              <span className="font-bold">{tf ? (oi === 0 ? 'T' : 'F') : OPTION_LABELS[oi]}</span>
                              <span className="max-w-[160px] truncate">{opt}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Tap the correct answer{it.question_type === 'multiple' ? '(s)' : ''} to set/confirm it.</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <button onClick={confirmBulkImport} disabled={bulkProcessing || bulkImporting || bulkItems.filter(bulkValid).length === 0}
                className="flex-1 bg-brand-600 text-white font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50">
                {bulkImporting ? 'Importing…' : bulkProcessing ? 'Reading…' : `Import ${bulkItems.filter(bulkValid).length} question${bulkItems.filter(bulkValid).length !== 1 ? 's' : ''}`}
              </button>
              <button onClick={() => setBulkItems(null)} disabled={bulkProcessing || bulkImporting}
                className="px-5 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl active:scale-95 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {duplicateOf && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-6" onClick={() => setDuplicateOf(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-2xl mb-2">⚠️</p>
            <h3 className="font-semibold text-gray-800 mb-1">Possible duplicate</h3>
            <p className="text-sm text-gray-600 mb-3">
              A question with the same text already exists in this bank (Q{duplicateOf.order_index}). Save it anyway?
            </p>
            <div className="flex gap-2">
              <button onClick={doSave} disabled={saving}
                className="flex-1 bg-brand-600 text-white font-medium py-2.5 rounded-xl active:scale-95 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save anyway'}
              </button>
              <button onClick={() => setDuplicateOf(null)}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl active:scale-95">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate scanner results */}
      {dupGroups && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex flex-col justify-end" onClick={() => setDupGroups(null)}>
          <div className="bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Duplicate questions</h3>
              <button onClick={() => setDupGroups(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            {dupGroups.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm text-gray-500">No duplicates found — your bank is clean!</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                <p className="text-xs text-gray-400">{dupGroups.length} set{dupGroups.length !== 1 ? 's' : ''} of duplicates found. Delete the extras you don’t need.</p>
                {dupGroups.map((g, gi) => (
                  <div key={gi} className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                    <p className="text-sm text-gray-800 line-clamp-2 mb-2">{g.items[0].question_text}</p>
                    <div className="space-y-1">
                      {g.items.map(it => (
                        <div key={it.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-2 py-1.5">
                          <span className="text-xs font-bold text-brand-600">Q{it.order_index}</span>
                          <button onClick={() => deleteFromScanner(it.id)}
                            className="text-red-400 text-xs active:scale-95">🗑 Delete</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
