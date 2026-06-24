export type QuestionType = 'single' | 'multiple' | 'truefalse'

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
}

export type QuestionBank = {
  id: string
  name: string
  description: string
  category: string
  question_count: number
  created_by: string
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

export type ExamAnswer = {
  questionId: string
  selectedIndices: number[]
  flagged: boolean
  skipped: boolean
  timeSpent: number
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
}
