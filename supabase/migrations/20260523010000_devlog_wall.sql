-- Devlog wall: per-submission public/private toggle + likes + threaded
-- comments. The submission_likes / submission_comments tables are keyed
-- on submission_id so they're reusable for other submission types down
-- the road, but for now only public devlogs surface on /devlogs.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

-- 1. Per-submission visibility.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS submissions_public_idx
  ON public.submissions (is_public, submitted_at DESC)
  WHERE is_public = true;

-- 2. Likes — one per (submission, user).
CREATE TABLE IF NOT EXISTS public.submission_likes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS submission_likes_submission_idx
  ON public.submission_likes (submission_id);

-- 3. Threaded comments (one level deep — replies collapse onto the
--    top-level comment, matching showcase_comments).
CREATE TABLE IF NOT EXISTS public.submission_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id      uuid REFERENCES public.submission_comments(id) ON DELETE CASCADE,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  deleted_reason text
);

CREATE INDEX IF NOT EXISTS submission_comments_submission_idx
  ON public.submission_comments (submission_id);

-- All access via the service-role admin client. RLS on, no policies.
ALTER TABLE public.submission_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_comments ENABLE ROW LEVEL SECURITY;
