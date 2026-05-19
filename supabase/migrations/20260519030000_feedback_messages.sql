-- Reply messages on top of a graded submission's initial feedback.
-- The first item in a thread is always the teacher's grades.feedback
-- text (rendered as the opening message). Rows here are the
-- back-and-forth that follow.
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  -- ON DELETE SET NULL so we don't drop history if a user is removed;
  -- the UI renders that case as "Removed user".
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_messages_submission_created_idx
  ON public.feedback_messages(submission_id, created_at);
