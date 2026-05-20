-- Excused assignments: a sparse (assignment, student) set. An excused
-- assignment doesn't count against the student -- excluded from their
-- average and never flagged as missing.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.assignment_excusals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS assignment_excusals_user_idx
  ON public.assignment_excusals (user_id);

ALTER TABLE public.assignment_excusals ENABLE ROW LEVEL SECURITY;
