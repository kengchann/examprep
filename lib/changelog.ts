// Bump alongside new changelog entries below.
export const APP_VERSION = '1.17.0'

// Maintained by hand — add a new entry whenever a feature ships. Newest first.
export type ChangeEntry = { date: string; title: string; items: string[] }

export const CHANGELOG: ChangeEntry[] = [
  {
    date: '2026-07-16',
    title: 'Filter and edit service tags, plus fewer unclassified',
    items: [
      'Admin → Questions has a service filter next to the search box — narrow the list to any one AWS service, or to Unclassified.',
      'The question editor now has an AWS service field: Auto-detect, a specific service to override, or Unclassified to clear it.',
      '“Which service should you use?” questions are now classified from their correct answer when the wording alone is inconclusive, so the SAA-C03 946 bank drops from 13 unclassified to 6. Re-run Auto-tag services to apply.',
    ],
  },
  {
    date: '2026-07-15 (4)',
    title: 'Smarter service classification — far fewer unclassified',
    items: [
      'Auto-tag services now assigns a service to nearly every question. On the SAA-C03 946 bank, unclassified dropped from 335 (35%) to 13 (1%).',
      'When several services score close together, the question is tagged with the one it is really about (e.g. the database, not the EC2 host or the KMS key it mentions in passing) instead of being left unclassified.',
      'Questions with only a weak, single mention still stay unclassified rather than being guessed. Re-run Auto-tag services on a bank to apply the new tagging.',
    ],
  },
  {
    date: '2026-07-15 (3)',
    title: 'Unclassified card in Study by Service',
    items: [
      'Study by Service now shows an "Unclassified" card (pinned last) for questions that have no assigned AWS service — the same group Admin shows under "(unclassified)". Every question in the bank is reachable again.',
      'Its count is computed from the same aggregation as the other service cards, so it always matches Admin.',
    ],
  },
  {
    date: '2026-07-15 (2)',
    title: 'Reverse question order',
    items: [
      'Exam setup now has a Question order picker: In order, Reverse, or Shuffle. Reverse walks your selected range from last to first (e.g. 946→1, or 7→3 if you picked that range).',
      'Available in Practice, Learning, and Custom modes. The old "Shuffle question order" checkbox is now the Shuffle option in this picker.',
    ],
  },
  {
    date: '2026-07-15',
    title: 'Trigger keywords rebuilt — colour-coded, ranked, with traps',
    items: [
      'Trigger phrases are now colour-coded by category (Cost, Ops overhead, Availability, Performance, Security, Integration, Storage, Data, Networking, Migration) — so you can see at a glance what a question is really testing, instead of every highlight looking the same.',
      'Triggers are ranked by how much they decide the answer: decisive ones are bold with a solid underline, supporting ones dotted, context ones plain.',
      'Tap any highlight for a full breakdown: what it signals, the services it points to, and — most importantly — the trap it rules out (e.g. "least operational overhead" rules out any answer with EC2 instances you patch yourself).',
      'The dictionary grew from about 60 phrases to nearly 200.',
      'The Trigger Trainer now drills the category, the services, and the trap too. A legend lives in the exam Instructions panel.',
    ],
  },
  {
    date: '2026-07-14 (4)',
    title: 'Highlights stay where you put them',
    items: [
      'Highlighting a word in one answer no longer highlights the same word in the question and every other answer. Each highlight now belongs to the specific block of text you made it in, and still survives answer shuffling.',
      'Built-in keyword highlights (amber) are unchanged — those deliberately mark every occurrence of an exam trigger word. Use 🔆 to turn them off.',
      'Highlights you saved before this update are kept as-is.',
    ],
  },
  {
    date: '2026-07-14 (3)',
    title: 'Highlighting works in Simulator',
    items: [
      'The 🔆 highlight toggle was missing from the Simulator exam screen, so keyword and personal highlights could not be turned on there. It is now in the Simulator header, next to the bookmark.',
    ],
  },
  {
    date: '2026-07-14 (2)',
    title: 'Simulator is now the default — and switchable mid-exam',
    items: [
      'Simulator is now the default design. Anyone who explicitly picked Classic or Modern keeps their choice.',
      'You can switch design without leaving a question — use Design in the exam header (🎨 in Classic/Modern). Your place, answers, timer, and any revealed answer are all kept.',
      'Learning mode now always shows you the answer before moving on: pressing Next on a question reveals the correct answer and explanation, and a second Next advances. Scoring is unchanged — a skipped question still counts as wrong.',
    ],
  },
  {
    date: '2026-07-14',
    title: 'Simulator design for the exam screen',
    items: [
      'New "Simulator" design — pick it in Settings → Appearance → Design. The exam screen takes on a classic desktop exam-simulator look: Mark, question counter, lettered options, inline Answer + Explanation panel, and a Previous / Next / Review / Show Answer / Show List / Save Session / End Exam toolbar.',
      'Includes a zoom control for the question text, and adapts to phone screens.',
      'Only the exam screen changes — the rest of the app stays on Modern, and scoring, mastery, and reveal rules are exactly the same.',
    ],
  },
  {
    date: '2026-07-12 (2)',
    title: 'Resume your exam on any device',
    items: [
      'Pausing an exam (Save & Exit) now also syncs your progress to the cloud — pause on your phone, pick it up on your computer, and vice versa.',
      'If you have a paused exam on two devices, the newer one wins automatically.',
    ],
  },
  {
    date: '2026-07-12',
    title: 'Study by Service',
    items: [
      'New "Study by Service" under Study Tools — practice every question for one AWS service (Lambda, S3, IAM, DynamoDB, etc.) instead of a broad topic.',
      'Questions are auto-classified by primary AWS service on import; existing banks can be backfilled from Admin → Questions → Auto-tag services.',
      'Topic-based mastery, weak areas, and exam behavior are unchanged — this is a new, separate layer.',
    ],
  },
  {
    date: '2026-07-01 (4)',
    title: 'Modern design is now the default',
    items: [
      'New and existing users now get the Modern design by default. Anyone who explicitly chose Classic keeps it — and you can always switch back in Settings → Appearance → Design.',
    ],
  },
  {
    date: '2026-07-01 (3)',
    title: 'Modern light theme + accent colors',
    items: [
      'Modern design now follows your Light/Dark theme setting instead of forcing dark.',
      'New accent colors for Modern: Violet, Blue, Emerald, Rose, Amber — pick in Settings → Appearance.',
      'Fixed: the Students manage panel rendered broken on desktop in Modern mode.',
    ],
  },
  {
    date: '2026-07-01 (2)',
    title: 'Modern design across the whole app',
    items: [
      'Modern mode now applies to every page: desktop sidebar + mobile bottom bar everywhere, centered content on large screens, redesigned page headers with subtle texture.',
      'Crisp new icon set (Lucide) replaces emoji in navigation.',
      'Polish: hover states, focus rings for keyboard users, themed scrollbars and text selection.',
    ],
  },
  {
    date: '2026-07-01',
    title: 'Modern design mode (optional)',
    items: [
      'New premium dark "Modern" design — switch in Settings → Appearance → Design, or tap Classic/Modern in the top bar. Instant, no reload; Classic stays the default.',
      'Redesigned dashboard: sidebar navigation on desktop, KPI cards (daily goal, questions, accuracy, streak, XP), featured Sprint card, question-bank grid with per-bank progress, weekly charts, and achievements.',
      'XP, levels, streaks, and achievements are calculated from your existing exam history — nothing about scoring or data changed.',
      'Online presence for admins: Students page shows who\'s online now (green dot + count).',
    ],
  },
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
