-- Pinned reminders a teacher keeps on a student -- e.g. "extended time
-- on tests" or "absent rest of this week". Shown on the student's
-- profile and on the grading screen for any of their submissions.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts
--
-- RLS is on with no policies, so only the service-role admin client
-- reaches it -- same pattern as assignment_excusals. All access happens
-- on requireTeacher()-gated routes; students never see these.

CREATE TABLE IF NOT EXISTS public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS student_notes_student_idx
  ON public.student_notes (student_id, created_at DESC);

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
