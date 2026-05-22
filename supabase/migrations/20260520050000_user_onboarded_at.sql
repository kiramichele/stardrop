-- Tracks whether a student has been through the first-login orientation.
-- null = not yet onboarded (the tour auto-opens on their dashboard).
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
