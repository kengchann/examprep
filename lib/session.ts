// Persistence for an in-progress exam so it survives a refresh / disconnect.
// Stored in two parts: META (static questions/config, written once) and STATE
// (answers/position/time, updated as you go) to avoid rewriting the big
// questions array on every change.
import type { Question, ExamMode, ExamAnswer } from './types'

export const SESSION_META_KEY = 'examprep_session_meta'
export const SESSION_STATE_KEY = 'examprep_session_state'

export type SessionMeta = {
  bankId: string
  bankName: string
  mode: ExamMode
  timeLimit: number | null
  questions: Question[]
}

export type SessionState = {
  answers: ExamAnswer[]
  current: number
  elapsed: number
  secondsLeft: number | null
  savedAt: number
}

export function readSession(): { meta: SessionMeta; state: SessionState } | null {
  if (typeof window === 'undefined') return null
  try {
    const metaRaw = localStorage.getItem(SESSION_META_KEY)
    const stateRaw = localStorage.getItem(SESSION_STATE_KEY)
    if (!metaRaw || !stateRaw) return null
    const meta = JSON.parse(metaRaw) as SessionMeta
    const state = JSON.parse(stateRaw) as SessionState
    if (!meta.questions?.length || !state.answers) return null
    return { meta, state }
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_META_KEY)
    localStorage.removeItem(SESSION_STATE_KEY)
  } catch {}
}
