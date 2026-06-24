import type { QuestionType } from './types'

// ── Raw CSV → rows of cells (RFC-4180-ish: handles quotes, escaped "", and newlines inside quotes) ──
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  // Normalise line endings
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++ }   // escaped quote
        else inQuotes = false
      } else {
        cell += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cell); cell = '' }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else cell += c
    }
  }
  // last cell / row
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))   // drop fully-blank lines
}

export type ParsedCSVRow = {
  rowNumber: number
  question_text: string
  question_type: QuestionType
  options: string[]
  correct_indices: number[]
  explanation: string
  topic: string
  error?: string
}

// Accept "A,C" / "A C" / "AC" / "1,3" (1-based) for correct answers
function parseCorrect(raw: string, optionCount: number): { indices: number[]; error?: string } {
  const tokens = raw.toUpperCase().replace(/[;|]/g, ',').split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) return { indices: [], error: 'no correct answer given' }
  const indices: number[] = []
  for (const t of tokens) {
    let idx: number
    if (/^[A-Z]$/.test(t)) idx = t.charCodeAt(0) - 65          // A→0, B→1…
    else if (/^\d+$/.test(t)) idx = parseInt(t, 10) - 1        // 1-based number → 0-based
    else return { indices: [], error: `unrecognised answer "${t}"` }
    if (idx < 0 || idx >= optionCount) return { indices: [], error: `answer "${t}" out of range` }
    if (!indices.includes(idx)) indices.push(idx)
  }
  return { indices: indices.sort((a, b) => a - b) }
}

const HEADER_ALIASES: Record<string, string> = {
  question: 'question_text', question_text: 'question_text', text: 'question_text',
  type: 'question_type', question_type: 'question_type',
  option_a: 'option_a', a: 'option_a',
  option_b: 'option_b', b: 'option_b',
  option_c: 'option_c', c: 'option_c',
  option_d: 'option_d', d: 'option_d',
  correct: 'correct_indices', correct_indices: 'correct_indices', answer: 'correct_indices', answers: 'correct_indices',
  explanation: 'explanation', explain: 'explanation',
  topic: 'topic', domain: 'topic',
}

export function parseQuestionCSV(text: string): ParsedCSVRow[] {
  const rows = parseCSV(text)
  if (rows.length < 2) return []

  const header = rows[0].map(h => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const get = (r: string[], name: string) => { const i = col(name); return i >= 0 ? (r[i] ?? '').trim() : '' }

  const out: ParsedCSVRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const rowNumber = i + 1
    const question_text = get(r, 'question_text')
    let type = get(r, 'question_type').toLowerCase()
    if (type === 't/f' || type === 'tf' || type === 'true/false') type = 'truefalse'
    if (type === 'multi') type = 'multiple'
    if (!['single', 'multiple', 'truefalse'].includes(type)) type = 'single'
    const question_type = type as QuestionType

    let options: string[]
    if (question_type === 'truefalse') {
      options = ['True', 'False']
    } else {
      options = [get(r, 'option_a'), get(r, 'option_b'), get(r, 'option_c'), get(r, 'option_d')].filter(o => o !== '')
    }

    const base: ParsedCSVRow = {
      rowNumber, question_text, question_type, options,
      correct_indices: [],
      explanation: get(r, 'explanation'),
      topic: get(r, 'topic') || 'General',
    }

    if (!question_text) { out.push({ ...base, error: 'missing question text' }); continue }
    if (question_type !== 'truefalse' && options.length < 2) {
      out.push({ ...base, error: 'needs at least 2 options' }); continue
    }
    const { indices, error } = parseCorrect(get(r, 'correct_indices'), options.length)
    if (error) { out.push({ ...base, error }); continue }
    if (question_type === 'single' && indices.length > 1) {
      out.push({ ...base, error: 'single-answer question has multiple correct answers' }); continue
    }
    out.push({ ...base, correct_indices: indices })
  }
  return out
}

export const CSV_TEMPLATE =
  'question_text,question_type,option_a,option_b,option_c,option_d,correct_indices,explanation,topic\n' +
  '"What does CPU stand for?",single,"Central Processing Unit","Computer Power Unit","Central Print Unit","Core Processing Unit",A,"The CPU is the brain of the computer.",Hardware\n' +
  '"Which are valid IP versions? (select all)",multiple,"IPv4","IPv6","IPv5","IPv8","A,B","IPv4 and IPv6 are in use.",Networking\n' +
  '"TCP is connection-oriented.",truefalse,,,,,A,"TCP establishes a connection before sending data.",Networking\n'
