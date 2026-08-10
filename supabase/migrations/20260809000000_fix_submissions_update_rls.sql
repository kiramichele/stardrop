-- The UPDATE policy on submissions still had "status <> 'graded'" in both
-- USING and WITH CHECK — a leftover from before students could resubmit
-- after grading. It silently overrode the app-level fix: Postgres RLS
-- just filters out the row instead of erroring, so a resubmit on an
-- already-graded row saved nothing and never flipped status back to
-- 'submitted'. The app already owns what's allowed to change and when;
-- RLS here just needs to gate by ownership.
--
-- Drops whichever policy currently owns UPDATE on submissions (name may
-- vary) and replaces it with an ownership-only check.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.submissions'::regclass AND polcmd = 'w'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.submissions', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "students_update_own_submissions" ON public.submissions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
