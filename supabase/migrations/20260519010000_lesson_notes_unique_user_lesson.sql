-- saveLessonNote upserts on (user_id, lesson_id), which requires a unique
-- constraint on that pair. Without it Postgres throws:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- Matches the shape of lesson_completions_user_id_lesson_id_key.
--
-- Guarded so the migration is safe to re-run -- ADD CONSTRAINT has no
-- IF NOT EXISTS form.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lesson_notes_user_id_lesson_id_key'
      AND conrelid = 'public.lesson_notes'::regclass
  ) THEN
    ALTER TABLE public.lesson_notes
      ADD CONSTRAINT lesson_notes_user_id_lesson_id_key
      UNIQUE (user_id, lesson_id);
  END IF;
END $$;
