-- Dashboard announcements: a teacher posts a short note, optionally scoped
-- to specific classes, and it shows on the matching students' dashboards
-- until the teacher deletes it. No scheduling, no per-student dismissal —
-- deliberately simple, same spirit as student_notes.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(trim(body)) > 0),
  -- Null/empty = every class.
  class_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_created_idx
  ON public.announcements (created_at DESC);

-- RLS is on with no policies, so only the service-role admin client reaches
-- it — same pattern as student_notes / parent_digests. The student
-- dashboard reads through a requireStudent()-gated server function using
-- the admin client, not the student's own session client.
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
