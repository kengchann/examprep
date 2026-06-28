import type { Question } from './types'

// A "study deck" is an ad-hoc set of questions (e.g. wrong answers, or starred)
// that we hand to the exam screen without going through a question bank. The
// launcher stashes the questions here, then navigates to
//   /exam?mode=learning&deck=1&bankName=...
// and the exam page reads them back.
export const DECK_KEY = 'examprep_deck'

export function setDeck(questions: Question[]) {
  try { sessionStorage.setItem(DECK_KEY, JSON.stringify(questions)) } catch {}
}

export function readDeck(): Question[] {
  try {
    const raw = sessionStorage.getItem(DECK_KEY)
    return raw ? (JSON.parse(raw) as Question[]) : []
  } catch {
    return []
  }
}
