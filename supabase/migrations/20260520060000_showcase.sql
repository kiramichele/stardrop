-- Project showcase / gallery: students publish playable Unity WebGL builds,
-- classmates play in-browser, like, and leave threaded comments.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts
-- (Until then, lib/showcase-server.ts reaches these tables through a typed
-- shim, so the app builds fine whether or not the regen has happened.)

-- =============================================================
-- Tables
-- =============================================================

CREATE TABLE IF NOT EXISTS public.showcase_projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  -- Storage folder for this project's build, "<user_id>/<project_id>".
  storage_prefix text NOT NULL,
  -- Storage path to the build's index.html; null until the upload finalizes.
  index_path     text,
  -- Optional cover image storage path.
  thumbnail_path text,
  file_count     integer NOT NULL DEFAULT 0,
  -- Students self-publish; a draft is visible only to its owner + teachers.
  published      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.showcase_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.showcase_projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.showcase_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.showcase_projects(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- One level of threading: a reply points at its top-level comment.
  parent_id      uuid REFERENCES public.showcase_comments(id) ON DELETE CASCADE,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Soft delete, matching discussion_posts.
  deleted_at     timestamptz,
  deleted_reason text
);

CREATE INDEX IF NOT EXISTS showcase_projects_user_idx
  ON public.showcase_projects (user_id);
CREATE INDEX IF NOT EXISTS showcase_projects_published_idx
  ON public.showcase_projects (published, created_at DESC);
CREATE INDEX IF NOT EXISTS showcase_likes_project_idx
  ON public.showcase_likes (project_id);
CREATE INDEX IF NOT EXISTS showcase_comments_project_idx
  ON public.showcase_comments (project_id);

-- All app access runs through the service-role admin client, so RLS is
-- enabled with no policies: locked to service role, closed to everyone else.
ALTER TABLE public.showcase_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_comments ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Storage bucket for the WebGL builds
-- =============================================================
-- Public bucket: builds are playable by anyone with the link (no login),
-- so the Unity loader can fetch every asset by its public URL. Listing,
-- likes, and comments still live behind the app login.
-- file_size_limit is 200 MB — drop it if your Supabase plan caps lower.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('showcase', 'showcase', true, 209715200)
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 209715200;

-- Students upload their build straight from the browser, so the bucket
-- needs write policies. Each student may only touch files under a folder
-- named with their own user id ("<user_id>/...").
DROP POLICY IF EXISTS "showcase owner insert" ON storage.objects;
CREATE POLICY "showcase owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'showcase'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "showcase owner update" ON storage.objects;
CREATE POLICY "showcase owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'showcase'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "showcase owner delete" ON storage.objects;
CREATE POLICY "showcase owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'showcase'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
