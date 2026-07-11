// Persistence for an in-progress exam so it survives a refresh / disconnect.
// Stored in two parts: META (static questions/config, written once) and STATE
// (answers/position/time, updated as you go) to avoid rewriting the big
// questions array on every change.
//
// This is device-local (localStorage) by design — fast, no network round trip
// on every keystroke. To let a paused exam follow you across devices (phone →
// PC), we additionally mirror it to a `active_session` cloud row at natural
// pause points (Pause button, tab hidden/closed) — same pattern already used
// for SRS review data. See pushCloudSession / fetchCloudSession below.
import { createClient } from './supabase'
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

export function writeSession(meta: SessionMeta, state: SessionState) {
  try {
    localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta))
    localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state))
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_META_KEY)
    localStorage.removeItem(SESSION_STATE_KEY)
  } catch {}
}

// ---- Cloud mirror (cross-device resume) ----

// Push the current in-progress exam to the cloud so another device can pick
// it up. One row per user — a newer push simply overwrites the old one.
export async function pushCloudSession(meta: SessionMeta, state: SessionState): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('active_session').upsert(
    { user_id: user.id, meta, state },
    { onConflict: 'user_id' }
  )
}

// Fetch whichever saved session is newest — local (this device) or cloud
// (any other device) — so switching devices mid-exam always resumes the
// most recent progress. Returns null if neither exists.
export async function fetchLatestSession(): Promise<{ meta: SessionMeta; state: SessionState } | null> {
  const local = readSession()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return local
  const { data } = await supabase.from('active_session').select('meta, state').eq('user_id', user.id).maybeSingle()
  const cloud = data ? { meta: data.meta as SessionMeta, state: data.state as SessionState } : null
  if (!cloud) return local
  if (!local) return cloud
  return cloud.state.savedAt > local.state.savedAt ? cloud : local
}

export async function clearCloudSession(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('active_session').delete().eq('user_id', user.id)
}
