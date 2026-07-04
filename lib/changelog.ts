// Bump alongside new changelog entries below.
export const APP_VERSION = '1.8.2'

// Maintained by hand — add a new entry whenever a feature ships. Newest first.
export type ChangeEntry = { date: string; title: string; items: string[] }

export const CHANGELOG: ChangeEntry[] = [
  {
    date: '2026-06-30 (6)',
    title: 'Editable bank names',
    items: [
      'Admins can now rename a question bank directly from Banks — tap the pencil icon next to the name.',
    ],
  },
  {
    date: '2026-06-30 (5)',
    title: 'Exam readiness now accounts for review retention',
    items: [
      'The Exam Readiness score can now dip slightly if Review Queue cards go badly neglected — a small nudge, not a penalty, and a no-op if you don\'t use Review Queue.',
      'Accuracy and coverage calculations are unchanged; per-topic Mastery bars, Weak Areas, and Daily Sprint are unaffected.',
    ],
  },
  {
    date: '2026-06-30 (4)',
    title: '"Show answer" in Learning mode',
    items: [
      'A new 👁 Show answer button in Learning mode reveals the correct answer without it counting as a wrong guess.',
      'Revealed questions are excluded from the My Mistakes deck, and are tagged "Revealed" in the review screen for clarity.',
    ],
  },
  {
    date: '2026-06-30 (3)',
    title: 'Match (drag-and-drop) question type',
    items: [
      'New "Match" question type — drag items into the right category, like the matching questions on exams such as CCNA.',
      'Works with touch and mouse, scored all-or-nothing per question.',
      'Admins can build match questions from the question editor, and they\'re included in bank backup/restore.',
    ],
  },
  {
    date: '2026-06-30 (2)',
    title: 'Readiness score, confidence tags & cloud-synced review',
    items: [
      'Exam Readiness score on the Mastery page — one number blending your accuracy and how much of the bank you\'ve covered.',
      'Confidence check while answering (Sure / Not sure / Guessed) — results now flag "overconfident misses" so you can spot the answers you were sure about but got wrong.',
      'Review Queue (spaced repetition) now syncs through your account, so progress follows you across devices instead of staying on one browser.',
    ],
  },
  {
    date: '2026-06-30',
    title: 'My Mistakes deck',
    items: [
      'A persistent "My Mistakes" deck under Study Tools — any question you miss is saved automatically and stays until you mark it mastered.',
      'Retake just the questions you missed, right from the results screen.',
    ],
  },
  {
    date: '2026-06-29',
    title: 'Learn hub: spaced repetition, mastery & more',
    items: [
      'New "Learn" tab: Review Queue (spaced repetition), Confusion Trainer, Trigger Trainer, Architecture Spotter, and a Mastery map.',
      'AI Study Assistant redesigned as a compact Insight Card — a quick, structured breakdown instead of a long chat.',
      'Shared Insight Card cache — explanations are generated once and reused for everyone, keeping things fast and nearly free to run.',
      'Daily Sprint: a short, focused 7-question session with streaks, for quick daily practice.',
    ],
  },
  {
    date: '2026-06-28',
    title: 'Accounts, trials & study tools',
    items: [
      'Account tiers: superadmin / admin / student roles, with a free trial (first 20 questions per bank) for new students.',
      'Forgot password, resend confirmation email, and a welcome screen after signup.',
      'Weak-area practice, wrong-answer review, and starred/bookmarked questions.',
      'Personal highlighter and built-in AWS keyword highlighting with tap-for-hint.',
      'Shuffle answer choices and question order.',
    ],
  },
  {
    date: '2026-06-27',
    title: 'Core exam experience',
    items: [
      'Practice, Learning, and Custom exam modes with save & resume.',
      'Full exam history with per-question review.',
      'Dark mode, adjustable text size, and sound/haptic feedback.',
      'Question bank backup & restore.',
    ],
  },
]
