-- Up to two parent/guardian contact emails per student, plus a log of the
-- manual digest emails a teacher sends to them. There's no scheduling here
-- — the teacher writes and sends each one by hand; the log just remembers
-- what went out and to how many people.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.users
  ADD COLUMN parent_email text,
  ADD COLUMN parent_email_2 text;

CREATE TABLE IF NOT EXISTS public.parent_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (length(trim(subject)) > 0),
  body text NOT NULL CHECK (length(trim(body)) > 0),
  -- Null/empty = every class. Stored for the history view; not a foreign
  -- key array since a referenced class could later be deleted.
  class_ids uuid[],
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_digests_created_idx
  ON public.parent_digests (created_at DESC);

-- RLS is on with no policies, so only the service-role admin client
-- reaches it — same pattern as student_notes / assignment_excusals. All
-- access happens on requireFullTeacher()-gated routes.
ALTER TABLE public.parent_digests ENABLE ROW LEVEL SECURITY;
