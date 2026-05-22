-- How long a quiz/exam attempt took, in seconds. Powers the quick quiz's
-- personal best time. Nullable — older attempts have no recorded time.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS duration_seconds integer;
