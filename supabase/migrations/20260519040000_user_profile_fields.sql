-- Profile fields on users + a public avatars bucket.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts
-- Then the asProfile() / updateProfileColumns() shims can be retired.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reduced_motion boolean NOT NULL DEFAULT false;

-- Public bucket: avatars render inline via <img> all over the app, so a
-- plain public URL is simplest. Storage object key is just the user id.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
