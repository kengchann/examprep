# ExamPrep v2 — VCE-Style Exam Simulator

A mobile-first exam simulator with multiple question types, exam modes, flagging, pause/resume, and topic analytics.

---

## What's new in v2

- **3 exam modes**: Practice (timed), Learning (instant feedback), Custom (pick range & time)
- **3 question types**: Single answer, Multiple answer (select all that apply), True/False
- **Question range picker**: Practice Q1–Q10 until memorized, then expand
- **Flag & review**: Mark questions during exam, review flagged at end
- **Pause & resume**: Pause mid-exam and come back
- **Question navigator**: Jump to any question, see answered/unanswered at a glance
- **Topic breakdown**: See your score per topic/domain
- **Exam history**: Track all past attempts with scores and time

---

## Setup (same as before)

### Step 1 — Update Supabase database

Since you're upgrading from v1, open Supabase → SQL Editor and run the upgrade lines:

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_indices INTEGER[] DEFAULT '{0}';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;
```

Or if starting fresh, run the full `supabase-setup.sql` file.

### Step 2 — Keep your .env.local

Your `.env.local` file from v1 works fine — same Supabase project, no changes needed.

### Step 3 — Replace project files

Copy all the new files into your `examprep` folder (overwrite existing ones).

### Step 4 — Install and run

```bash
npm install
npm run dev
```

---

## How to use

### Creating questions

1. Go to **Banks tab** → create a bank
2. Go to **Questions tab** → select your bank → tap **+ Add question**
3. Choose question type:
   - **Single** — one correct answer
   - **Multiple** — tap multiple letters to mark all correct answers
   - **True/False** — tap T or F
4. Add a **Topic/Domain** (e.g. "OSI Model", "Security") for analytics
5. Add an **Explanation** — shown in Learning mode and Results

### Taking an exam

1. Go to **Home** → select a bank
2. Choose a mode:
   - **Practice Exam** — pick question range, set time limit, exam-like conditions
   - **Learning Mode** — see correct answer immediately after each question
   - **Custom Mode** — fully configure range, time, and shuffle
3. During the exam:
   - Tap **⚑** to flag a question for review
   - Tap the question counter (e.g. "5/20") to open the question navigator
   - Tap **⏸ Pause** to pause and resume later
   - Tap **Skip** to move on without answering

### Results

- **Summary tab** — score, pass/fail, breakdown bar
- **Topics tab** — per-topic performance (shows weakest topics first)
- **Review tab** — every question with correct answers and explanations
  - Filter to flagged questions only

---

## Phone access

While `npm run dev` is running:
1. Find your PC IP: run `ipconfig` in Command Prompt → look for IPv4 Address
2. On your phone (same Wi-Fi): open `http://YOUR_IP:3000`

---

## Project structure

```
examprep/
├── app/
│   ├── auth/page.tsx           # Login & signup
│   ├── dashboard/page.tsx      # Home — pick bank & mode
│   ├── exam/page.tsx           # Full exam engine
│   ├── results/page.tsx        # Score, topics, review
│   ├── history/page.tsx        # Past attempts
│   └── admin/
│       ├── banks/page.tsx      # Manage banks
│       └── questions/page.tsx  # Add/delete questions
├── components/
│   └── BottomNav.tsx
├── lib/
│   ├── supabase.ts
│   └── types.ts                # Shared TypeScript types
└── supabase-setup.sql
```
