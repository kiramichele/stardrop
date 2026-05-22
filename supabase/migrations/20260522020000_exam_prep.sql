-- Exam-prep section: study resources for the Unity Certified Associate
-- Programmer exam. Glossary terms reuse the existing glossary_terms table;
-- this migration adds the question bank, code examples, and per-student
-- quiz history.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts
--
-- RLS is on with no policies -- all access runs through the service-role
-- admin client on requireUser()-gated routes, same pattern as `assets`.

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  choice_a text NOT NULL,
  choice_b text NOT NULL,
  choice_c text NOT NULL,
  choice_d text NOT NULL,
  correct text NOT NULL CHECK (correct IN ('a', 'b', 'c', 'd')),
  explanation text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.code_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  code text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- One row per finished quiz or practice exam, powering best-score and
-- history on the exam-prep hub.
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('quiz', 'exam')),
  score integer NOT NULL,
  total integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx
  ON public.quiz_attempts (user_id, created_at DESC);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
