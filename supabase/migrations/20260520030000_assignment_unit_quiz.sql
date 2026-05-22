-- Marks an assignment as its unit's quiz/test. Such assignments group
-- into a "Unit Quiz" section at the end of the unit, instead of under a
-- specific lesson. The unit itself is still derived from the linked lesson.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS is_unit_quiz boolean NOT NULL DEFAULT false;
