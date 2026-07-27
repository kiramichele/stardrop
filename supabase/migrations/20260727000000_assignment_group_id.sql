-- Assignments are stored per-class (one row per class the work is given to).
-- To present "one assignment given to all classes" as a single row — and to
-- act on all its copies together (publish, delete) — we stamp the copies made
-- in one create with a shared assignment_group_id.
--
-- Nullable + no backfill: existing copies have NULL and the UI falls back to
-- grouping them by (title, type, lesson, quiz) so they still collapse nicely.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS assignment_group_id uuid;

CREATE INDEX IF NOT EXISTS assignments_group_idx
  ON public.assignments (assignment_group_id);
