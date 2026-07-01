export type QuestionType = 'single' | 'multiple' | 'truefalse' | 'match'

export type ExamMode = 'practice' | 'learning' | 'custom'

export type Question = {
  id: string
  bank_id: string
  question_text: string
  question_type: QuestionType
  options: string[]
  correct_indices: number[]   // supports multiple correct answers
  explanation: string
  topic: string
  image_url: string | null    // optional exhibit image (Supabase storage)
  order_index: number
  created_at: string
  // Only present for question_type === 'match' (drag-and-drop matching).
  match_items?: string[] | null      // draggable statements
  match_buckets?: string[] | null    // category targets
  match_correct?: number[] | null    // parallel to match_items: index into match_buckets, or -1 = leave unassigned
}

export type QuestionBank = {
  id: string
  name: string
  description: string
  category: string
  question_count: number
  is_open: boolean          // open to all students (no per-student assignment needed)
  created_by: string
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'superadmin' | 'admin' | 'student'
  tier: 'trial' | 'full'        // students only; admins/superadmins are always full
  last_active: string | null
  created_at: string
}

export type Attempt = {
  id: string
  user_id: string
  bank_id: string | null
  bank_name: string
  mode: string
  score: number
  correct: number
  total: number
  elapsed_seconds: number
  details: AttemptResult[] | null   // full per-question results, for review
  created_at: string
}

export type ExamSession = {
  bankId: string
  bankName: string
  mode: ExamMode
  timeLimit: number | null      // minutes, null = untimed
  questions: Question[]
  answers: ExamAnswer[]
  startedAt: number
  pausedAt: number | null
  elapsedSeconds: number
}

export type Confidence = 'sure' | 'unsure' | 'guess'

export type ExamAnswer = {
  questionId: string
  selectedIndices: number[]
  flagged: boolean
  skipped: boolean
  timeSpent: number
  confidence?: Confidence
  matchAssignment?: number[]   // 'match' questions only: parallel to match_items, bucket index per item (-1 = unassigned)
}

export type AttemptResult = {
  questionId: string
  question_text: string
  question_type: QuestionType
  options: string[]
  correct_indices: number[]
  selected_indices: number[]
  explanation: string
  topic: string
  image_url: string | null
  correct: boolean
  flagged: boolean
  skipped: boolean
  confidence?: Confidence
  // 'match' questions only
  match_items?: string[] | null
  match_buckets?: string[] | null
  match_correct?: number[] | null
  match_assignment?: number[] | null
}
