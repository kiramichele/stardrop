-- StarHub portfolio surface — adds the per-assignment auto-publish
-- toggle, two identity fields on users (bio + studio/role), and a new
-- table for free-form code gists.
--
-- Internal identifiers stay neutral (`portfolio_gists`, `auto_publish_to_starhub`)
-- while the UI calls the surface "StarHub".
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

-- 1. Per-assignment auto-publish toggle (instructor-controlled).
--    When true, non-video submissions flip to is_public on submit.
--    For video assignments (devlog, video_response) it pre-fills the
--    student's public/private toggle but never auto-sets it.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS auto_publish_to_starhub boolean NOT NULL DEFAULT false;

-- 2. Identity fields for the StarHub header.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio    text,
  ADD COLUMN IF NOT EXISTS studio text;

-- 3. Free-form code gists — title + caption + single code blob.
CREATE TABLE IF NOT EXISTS public.portfolio_gists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  -- Highlight.js / Shiki language id. Default to C# since this is a
  -- Unity-focused class.
  language    text NOT NULL DEFAULT 'csharp',
  code        text NOT NULL,
  is_public   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_gists_user_idx
  ON public.portfolio_gists (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_gists_public_idx
  ON public.portfolio_gists (is_public, created_at DESC)
  WHERE is_public = true;

-- All app access via the service-role admin client.
ALTER TABLE public.portfolio_gists ENABLE ROW LEVEL SECURITY;
