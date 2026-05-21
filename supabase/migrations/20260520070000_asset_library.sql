-- Asset library: a curated game-dev resource hub. The teacher uploads
-- sprites / sounds / templates or links out to favorites; students can
-- link assets they love (e.g. from the Unity Asset Store) too.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts
-- (Until then, lib/assets-server.ts reaches this table through a typed
-- shim, so the app builds fine whether or not the regen has happened.)

CREATE TABLE IF NOT EXISTS public.assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  -- One of the keys in lib/assets.ts ASSET_CATEGORIES.
  category     text NOT NULL,
  -- External link assets: the destination URL (null for uploaded files).
  url          text,
  -- Uploaded file assets: storage path in the `assets` bucket (null for links).
  storage_path text,
  file_name    text,
  file_size    bigint,
  mime_type    text,
  added_by     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_category_idx ON public.assets (category);
CREATE INDEX IF NOT EXISTS assets_created_idx ON public.assets (created_at DESC);

-- All app access runs through the service-role admin client, so RLS is
-- enabled with no policies: locked to service role, closed to everyone else.
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Public bucket for uploaded assets so students can grab files by their
-- direct URL. Uploads happen server-side through the admin client (which
-- bypasses RLS), so no storage object policies are needed.
-- file_size_limit is 25 MB — bigger assets should be added as links.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('assets', 'assets', true, 26214400)
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 26214400;
