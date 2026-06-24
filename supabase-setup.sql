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
-- Row Level Security
-- ============================================

ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read banks" ON question_banks;
DROP POLICY IF EXISTS "Authenticated users can create banks" ON question_banks;
DROP POLICY IF EXISTS "Creator can delete their banks" ON question_banks;
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can add questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can delete questions" ON questions;

CREATE POLICY "Anyone can read banks" ON question_banks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create banks" ON question_banks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator can delete their banks" ON question_banks FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can add questions" ON questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update questions" ON questions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete questions" ON questions FOR DELETE USING (auth.role() = 'authenticated');

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
  FOR INSERT WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete question images" ON storage.objects
  FOR DELETE USING (bucket_id = 'question-images' AND auth.role() = 'authenticated');
