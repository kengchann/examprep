import { createClient } from './supabase'
import type { Question, AttemptResult } from './types'

// Adaptive "weak areas" engine. Everything is derived from data we already
// store (attempts.details) — no extra tables.
//
// How weakness is scored:
//  - We look at your attempts, newest first, and weight recent ones more
//    (exponential decay). So as you improve, your score improves and the topic's
//    priority drops automatically — older mistakes fade out.
//  - weakness = 1 - (recency-weighted accuracy) for each topic.

export type TopicStat = {
  topic: string
  accuracy: number   // 0..1, recency-weighted
  weakness: number   // 1 - accuracy
  seen: number       // distinct questions answered in this topic
}

const DECAY = 0.9            // each older attempt counts 90% of the next newer one
const MAX_ATTEMPTS = 60      // cap how far back we look
const MAX_TOPICS = 10        // how many weak topics to pull from

type History = {
  topics: TopicStat[]        // sorted weakest-first
  wrongIds: Set<string>      // questions whose MOST RECENT outcome was wrong/skipped
  seenIds: Set<string>       // every question you've answered
}

async function gatherHistory(): Promise<History> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { topics: [], wrongIds: new Set(), seenIds: new Set() }

  const { data } = await supabase
    .from('attempts')
    .select('details, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_ATTEMPTS)

  type Agg = { wCorrect: number; wTotal: number; ids: Set<string> }
  const agg = new Map<string, Agg>()
  const seenIds = new Set<string>()
  const outcome = new Map<string, boolean>()   // qid -> most recent correctness

  ;(data ?? []).forEach((att: { details: AttemptResult[] | null }, i: number) => {
    const w = Math.pow(DECAY, i)               // newer attempts weigh more
    for (const r of att.details ?? []) {
      const t = r.topic || 'General'
      let a = agg.get(t)
      if (!a) { a = { wCorrect: 0, wTotal: 0, ids: new Set() }; agg.set(t, a) }
      a.wTotal += w
      if (r.correct) a.wCorrect += w
      a.ids.add(r.questionId)
      if (!outcome.has(r.questionId)) outcome.set(r.questionId, r.correct)  // newest wins
      seenIds.add(r.questionId)
    }
  })

  const wrongIds = new Set(Array.from(outcome).filter(([, ok]) => !ok).map(([id]) => id))
  const topics: TopicStat[] = Array.from(agg)
    .map(([topic, a]) => {
      const accuracy = a.wTotal > 0 ? a.wCorrect / a.wTotal : 1
      return { topic, accuracy, weakness: 1 - accuracy, seen: a.ids.size }
    })
    .filter(t => t.seen > 0)
    .sort((a, b) => b.weakness - a.weakness || b.seen - a.seen)

  return { topics, wrongIds, seenIds }
}

// Public: the weak-topic breakdown (for the Study screen list).
export async function computeWeakTopics(): Promise<TopicStat[]> {
  return (await gatherHistory()).topics
}

// Order a topic's questions: ones you got wrong first, then unseen, then the
// rest — with a shuffle inside each tier for variety.
function prioritize(qs: Question[], wrongIds: Set<string>, seenIds: Set<string>): Question[] {
  const shuffle = (a: Question[]) => a.sort(() => Math.random() - 0.5)
  const wrong = shuffle(qs.filter(q => wrongIds.has(q.id)))
  const unseen = shuffle(qs.filter(q => !seenIds.has(q.id) && !wrongIds.has(q.id)))
  const rest = shuffle(qs.filter(q => seenIds.has(q.id) && !wrongIds.has(q.id)))
  return [...wrong, ...unseen, ...rest]
}

// Public: build an adaptive practice deck of `count` questions from your weakest
// topics (weakest first), pulled from the existing bank. Returns the deck plus
// the weak topics it drew from (for a little summary).
export async function buildWeakDeck(count: number): Promise<{ deck: Question[]; topics: TopicStat[] }> {
  const { topics, wrongIds, seenIds } = await gatherHistory()
  const weak = topics.filter(t => t.weakness > 0.001).slice(0, MAX_TOPICS)
  if (weak.length === 0) return { deck: [], topics: [] }

  const names = weak.map(t => t.topic)
  const supabase = createClient()
  // RLS still applies (trial users only get the first 20 questions of a bank).
  const { data } = await supabase.from('questions').select('*').in('topic', names)
  const all = (data ?? []) as Question[]

  const groups = new Map<string, Question[]>()
  for (const t of names) groups.set(t, [])
  for (const q of all) groups.get(q.topic)?.push(q)
  for (const t of names) groups.set(t, prioritize(groups.get(t)!, wrongIds, seenIds))

  // Weighted round-robin, weakest topic first each round → weakest gets the most.
  const deck: Question[] = []
  let progressed = true
  while (deck.length < count && progressed) {
    progressed = false
    for (const t of names) {
      if (deck.length >= count) break
      const g = groups.get(t)!
      if (g.length) { deck.push(g.shift()!); progressed = true }
    }
  }
  return { deck, topics: weak }
}
