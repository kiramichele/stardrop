-- Devlog assignment type: weekly screen-recording (with mic + optional
-- camera PIP) OR uploaded video. Replaces the check-in flow for weekly
-- reflections.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

-- 1. New enum value.
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'devlog';

-- 2. Private storage bucket for devlog videos. Files can be sizeable
--    (multi-minute recordings), so uploads bypass the server-action body
--    limit by going straight to storage from the browser. Reads are
--    proxied through /api/files/devlogs so they stay auth-gated.
--    500 MB per-file ceiling — bump if your Supabase plan caps lower.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('devlogs', 'devlogs', false, 524288000)
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = 524288000;

-- 3. Storage RLS: each student can only touch files under a folder
--    named with their own user id ("<user_id>/<submission_id>/<file>").
DROP POLICY IF EXISTS "devlog owner insert" ON storage.objects;
CREATE POLICY "devlog owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'devlogs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "devlog owner update" ON storage.objects;
CREATE POLICY "devlog owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'devlogs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "devlog owner delete" ON storage.objects;
CREATE POLICY "devlog owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'devlogs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
