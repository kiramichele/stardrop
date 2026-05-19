-- saveLessonNote upserts on (user_id, lesson_id), which requires a unique
-- constraint on that pair. Without it Postgres throws:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- Matches the shape of lesson_completions_user_id_lesson_id_key.

ALTER TABLE public.lesson_notes
  ADD CONSTRAINT lesson_notes_user_id_lesson_id_key
  UNIQUE (user_id, lesson_id);
