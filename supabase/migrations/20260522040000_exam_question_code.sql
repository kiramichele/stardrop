-- An optional code snippet shown as part of an exam question. Empty
-- string means the question has no code part.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT '';
