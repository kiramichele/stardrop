-- Commits: a lightweight, Git-like version history for solo code
-- assignments. Autosave keeps writing the working copy to
-- submissions.content; a commit is a deliberate, named snapshot the
-- student chooses to record. Nothing is ever rewritten or deleted —
-- Restore loads an old snapshot into the editor and the student commits
-- it as a new commit (like `git revert`), so history only moves forward.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

CREATE TABLE IF NOT EXISTS public.code_commits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  -- Denormalized so teacher views can query by assignment without a join.
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- The commit this one came after (null for the first commit) — the
  -- same parent link a real Git commit has.
  parent_id     uuid REFERENCES public.code_commits(id) ON DELETE SET NULL,
  message       text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 100),
  -- Full snapshot, not a diff: student files are small and this keeps
  -- Restore trivial. Diffs are computed on read when needed.
  code          text NOT NULL,
  -- sha256 of code — lets the server refuse an empty "nothing changed" commit.
  code_hash     text NOT NULL,
  -- Set when this commit was made right after restoring an older one.
  restored_from uuid REFERENCES public.code_commits(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS code_commits_submission_idx
  ON public.code_commits (submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS code_commits_assignment_idx
  ON public.code_commits (assignment_id);

-- All access goes through server actions on the admin client (authorized
-- at the action layer). RLS on, no policies — closed to direct access.
ALTER TABLE public.code_commits ENABLE ROW LEVEL SECURITY;

-- Per-assignment switch: Submit is blocked until the student has made at
-- least one commit. Added as false so assignments students are already
-- working on aren't suddenly gated, then the default flips to true so
-- every NEW assignment requires a commit unless the teacher unticks it.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS require_commit boolean NOT NULL DEFAULT false;
ALTER TABLE public.assignments
  ALTER COLUMN require_commit SET DEFAULT true;
