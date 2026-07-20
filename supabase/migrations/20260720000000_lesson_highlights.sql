-- Per-student highlights inside a lesson. A student selects text in the
-- lesson iframe and marks it in one of a few colors; the highlight is saved
-- and re-applied when they return. Supports an IEP accommodation (highlight
-- text in lessons) and is available to every student (universal design).
--
-- Anchoring: character offsets into the lesson body's text content. Lesson
-- HTML is static per lesson, so (start_offset, end_offset) are stable; the
-- `quote` column stores the highlighted text so the client can validate the
-- offsets still line up before re-applying (and skip cleanly if the teacher
-- re-uploaded different content).
--
-- Access is owner-scoped via RLS: the student's own session client reads and
-- writes only their rows (same shape as lesson_notes, which students reach
-- through the session client). Teachers have no reason to see highlights.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.lesson_highlights (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset   integer NOT NULL CHECK (end_offset > start_offset),
  quote        text NOT NULL CHECK (length(trim(quote)) > 0),
  color        text NOT NULL DEFAULT 'yellow'
                 CHECK (color IN ('yellow', 'green', 'pink', 'blue')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_highlights_user_lesson_idx
  ON public.lesson_highlights (user_id, lesson_id);

ALTER TABLE public.lesson_highlights ENABLE ROW LEVEL SECURITY;

-- A student can read their own highlights.
DROP POLICY IF EXISTS "own highlights select" ON public.lesson_highlights;
CREATE POLICY "own highlights select"
  ON public.lesson_highlights
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- A student can create highlights for themselves.
DROP POLICY IF EXISTS "own highlights insert" ON public.lesson_highlights;
CREATE POLICY "own highlights insert"
  ON public.lesson_highlights
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- A student can remove their own highlights.
DROP POLICY IF EXISTS "own highlights delete" ON public.lesson_highlights;
CREATE POLICY "own highlights delete"
  ON public.lesson_highlights
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
