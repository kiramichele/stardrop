-- StarHub posts: a student can post free-form text and/or a gallery of
-- photos/screenshots/videos (e.g. shots of their Unity editor) directly to
-- their portfolio — not tied to any assignment/gist/showcase.
--
-- A post is optional text + optional media. Public by default (the point is to
-- share it), with a per-post toggle. All app access via the service-role admin
-- client, like portfolio_gists.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.portfolio_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body       text,
  -- Array of { id, kind:'image'|'video', storagePath, mime, size, createdAt }.
  media      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_posts_user_idx
  ON public.portfolio_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS portfolio_posts_public_idx
  ON public.portfolio_posts (is_public, created_at DESC)
  WHERE is_public = true;

ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;

-- Public bucket for post media — portfolios are public, so media is served by
-- public URL (same as the Showcase bucket).
INSERT INTO storage.buckets (id, name, public)
VALUES ('starhub', 'starhub', true)
ON CONFLICT (id) DO NOTHING;

-- Students upload from the browser, so the bucket needs write policies. Each
-- student may only touch files under a folder named with their own user id.
DROP POLICY IF EXISTS "starhub owner insert" ON storage.objects;
CREATE POLICY "starhub owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'starhub'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "starhub owner update" ON storage.objects;
CREATE POLICY "starhub owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'starhub'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "starhub owner delete" ON storage.objects;
CREATE POLICY "starhub owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'starhub'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
