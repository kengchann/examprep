-- ============================================
-- ExamPrep v2 - Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- If upgrading from v1, run the ALTER TABLE
-- statements at the bottom instead
-- ============================================

-- 1. Question Banks table
CREATE TABLE IF NOT EXISTS question_banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'IT',
  question_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Questions table (v2 - supports multiple answer types)
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'single',   -- 'single' | 'multiple' | 'truefalse'
  options TEXT[] NOT NULL,
  correct_indices INTEGER[] NOT NULL,    -- array of correct option indices
  explanation TEXT DEFAULT '',
  topic TEXT DEFAULT 'General',
  image_url TEXT,                        -- optional exhibit image (Supabase storage)
  order_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- IF UPGRADING FROM v1 — run these instead:
-- ============================================
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single';
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_indices INTEGER[] DEFAULT '{0}';
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General';
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;
-- UPDATE questions SET correct_indices = ARRAY[correct_index] WHERE correct_indices IS NULL;
-- ============================================

-- 3. Helper functions
CREATE OR REPLACE FUNCTION increment_question_count(bank_id_param UUID)
RETURNS VOID AS $$
  UPDATE question_banks SET question_count = question_count + 1 WHERE id = bank_id_param;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION decrement_question_count(bank_id_param UUID)
RETURNS VOID AS $$
  UPDATE question_banks SET question_count = GREATEST(question_count - 1, 0) WHERE id = bank_id_param;
$$ LANGUAGE SQL;

-- ============================================
-- Roles — admin vs student (profiles table)
-- ============================================

-- Each auth user gets a profile row. role defaults to 'student'.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student',   -- 'admin' | 'student'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Auto-create a profile whenever someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any users who signed up before this table existed
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, raw_user_meta_data->>'full_name', 'student'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Helper: is the current user an admin? (SECURITY DEFINER so it can read profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ============================================
-- Row Level Security — students read, admins write
-- ============================================

ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read banks" ON question_banks;
DROP POLICY IF EXISTS "Authenticated users can create banks" ON question_banks;
DROP POLICY IF EXISTS "Creator can delete their banks" ON question_banks;
DROP POLICY IF EXISTS "Admins can create banks" ON question_banks;
DROP POLICY IF EXISTS "Admins can update banks" ON question_banks;
DROP POLICY IF EXISTS "Admins can delete banks" ON question_banks;
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can add questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can update questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can add questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON questions;

-- Banks: any logged-in user can read; only admins can write
CREATE POLICY "Anyone can read banks" ON question_banks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can create banks" ON question_banks FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update banks" ON question_banks FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete banks" ON question_banks FOR DELETE USING (public.is_admin());

-- Questions: any logged-in user can read; only admins can write
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can add questions" ON questions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update questions" ON questions FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete questions" ON questions FOR DELETE USING (public.is_admin());

-- ============================================
-- v2.1 UPGRADE — run these if your tables already exist
-- ============================================
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
-- DROP POLICY IF EXISTS "Authenticated users can update questions" ON questions;
-- CREATE POLICY "Authenticated users can update questions" ON questions FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- Storage — question exhibit images
-- Creates a public bucket so <img src> works without signed URLs.
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete question images" ON storage.objects;

CREATE POLICY "Public can view question images" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-images');
CREATE POLICY "Authenticated can upload question images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'question-images' AND public.is_admin());
CREATE POLICY "Authenticated can delete question images" ON storage.objects
  FOR DELETE USING (bucket_id = 'question-images' AND public.is_admin());

-- ============================================
-- v2.3 — Student management & access control
-- ============================================

-- Banks: "open to all students" flag
ALTER TABLE question_banks ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT false;

-- Profiles: last-active timestamp
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

-- Admins can read every profile and change roles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles FOR UPDATE USING (public.is_admin());

-- Students stamp their own last_active without being able to edit their role
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_active = NOW() WHERE id = auth.uid();
$$;

-- Which student may use which bank
CREATE TABLE IF NOT EXISTS bank_access (
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, bank_id)
);
ALTER TABLE bank_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage bank access" ON bank_access;
DROP POLICY IF EXISTS "Students read own bank access" ON bank_access;
CREATE POLICY "Admins manage bank access" ON bank_access FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Students read own bank access" ON bank_access FOR SELECT USING (auth.uid() = student_id);

-- Exam attempts recorded server-side so admins can see activity
CREATE TABLE IF NOT EXISTS attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES question_banks(id) ON DELETE SET NULL,
  bank_name TEXT,
  mode TEXT,
  score INTEGER,
  correct INTEGER,
  total INTEGER,
  elapsed_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own attempts" ON attempts;
DROP POLICY IF EXISTS "Users read own attempts" ON attempts;
DROP POLICY IF EXISTS "Admins read all attempts" ON attempts;
CREATE POLICY "Users insert own attempts" ON attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own attempts" ON attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all attempts" ON attempts FOR SELECT USING (public.is_admin());

-- Restrict bank & question reads to assigned / open banks (admins still see all)
DROP POLICY IF EXISTS "Anyone can read banks" ON question_banks;
DROP POLICY IF EXISTS "Read assigned or open banks" ON question_banks;
CREATE POLICY "Read assigned or open banks" ON question_banks FOR SELECT USING (
  public.is_admin()
  OR is_open
  OR EXISTS (SELECT 1 FROM bank_access ba WHERE ba.bank_id = question_banks.id AND ba.student_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Read questions of assigned or open banks" ON questions;
CREATE POLICY "Read questions of assigned or open banks" ON questions FOR SELECT USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM question_banks b
    WHERE b.id = questions.bank_id
      AND (b.is_open OR EXISTS (
        SELECT 1 FROM bank_access ba WHERE ba.bank_id = b.id AND ba.student_id = auth.uid()
      ))
  )
);

-- v2.4 — store full per-question results so students can review past attempts
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS details JSONB;

-- ============================================
-- v2.5 — Bookmarks ("starred" questions), cloud-synced per user
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES question_banks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON bookmarks;
CREATE POLICY "Users manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- v2.6 — Personal per-question highlights (student-created), cloud-synced
-- ============================================
CREATE TABLE IF NOT EXISTS question_highlights (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  phrases TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE question_highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own highlights" ON question_highlights;
CREATE POLICY "Users manage own highlights" ON question_highlights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- v2.7 — Account tiers: superadmin / admin / student + free trial
--   roles : 'superadmin' > 'admin' > 'student'
--   tier  : 'trial' (first 20 questions per bank) or 'full'  (students only)
-- ============================================

-- Student access tier. New signups default to 'trial'.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'trial';

-- OPTIONAL — run ONCE if you already have real students who should keep full
-- access (otherwise they'd drop to trial). Leave commented to stay re-runnable:
-- UPDATE public.profiles SET tier = 'full' WHERE role = 'student';

-- is_admin() now also covers superadmin (so superadmin keeps every admin power).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'));
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$;

-- Effective tier of the current user (admins/superadmins are always 'full').
CREATE OR REPLACE FUNCTION public.user_tier()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT CASE WHEN role IN ('admin','superadmin') THEN 'full' ELSE COALESCE(tier,'trial') END
  FROM public.profiles WHERE id = auth.uid();
$$;

-- Is a question within the first 20 of its bank? SECURITY DEFINER so it reads
-- `questions` WITHOUT re-triggering the questions RLS policy (avoids infinite
-- recursion — a policy on `questions` must never query `questions` directly).
CREATE OR REPLACE FUNCTION public.q_in_trial_window(q_bank uuid, q_order int)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.questions q2
            WHERE q2.bank_id = q_bank AND q2.order_index < q_order) < 20;
$$;

-- Keeps the trial "first 20" check fast.
CREATE INDEX IF NOT EXISTS idx_questions_bank_order ON questions(bank_id, order_index);

-- Tier-aware question reads: admins see all; full students see assigned/open
-- banks; trial students see only the first 20 questions of those banks.
DROP POLICY IF EXISTS "Read questions of assigned or open banks" ON questions;
DROP POLICY IF EXISTS "Read questions by tier and access" ON questions;
CREATE POLICY "Read questions by tier and access" ON questions FOR SELECT USING (
  public.is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM question_banks b
      WHERE b.id = questions.bank_id
        AND (b.is_open OR EXISTS (
          SELECT 1 FROM bank_access ba WHERE ba.bank_id = b.id AND ba.student_id = auth.uid()
        ))
    )
    AND (
      public.user_tier() = 'full'
      OR public.q_in_trial_window(questions.bank_id, questions.order_index)
    )
  )
);

-- Lock down profile writes: no broad admin update. Role/tier changes go through
-- the SECURITY DEFINER functions below, which enforce who may do what.
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Admins (and superadmins) set a STUDENT's trial/full tier.
CREATE OR REPLACE FUNCTION public.set_user_tier(target uuid, new_tier text)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF new_tier NOT IN ('trial','full') THEN RAISE EXCEPTION 'invalid tier'; END IF;
  UPDATE public.profiles SET tier = new_tier WHERE id = target AND role = 'student';
END; $$;

-- Only a SUPERADMIN may change roles, and never their own.
CREATE OR REPLACE FUNCTION public.set_user_role(target uuid, new_role text)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF target = auth.uid() THEN RAISE EXCEPTION 'cannot change your own role'; END IF;
  IF new_role NOT IN ('student','admin','superadmin') THEN RAISE EXCEPTION 'invalid role'; END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target;
END; $$;

GRANT EXECUTE ON FUNCTION public.set_user_tier(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- 👑 MAKE YOURSELF SUPERADMIN — run this once with your login email:
-- UPDATE public.profiles SET role = 'superadmin' WHERE email = 'kengchann@gmail.com';

-- ============================================
-- 👑 MAKE YOURSELF ADMIN
-- Replace the email with the one you log into the app with, then run this line:
-- ============================================
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'kengchann@gmail.com';
