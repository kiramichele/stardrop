-- Class color tags: a per-class accent color so the teacher can tell
-- periods apart at a glance across the UI (class list, grading queue, etc.).
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts
-- (Until then, lib/class-colors-server.ts reads/writes this column through
-- a typed cast, so the app builds fine whether or not the regen has run.)

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS color text;
