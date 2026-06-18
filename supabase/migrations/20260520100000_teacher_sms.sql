-- Teacher SMS notifications: optional opt-in phone number + per-event
-- toggles for heads-up texts (feedback replies, discussion posts, new
-- showcase projects).
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts
-- (Until then, lib/sms-server.ts reads/writes these columns through a
-- typed cast, so the app builds fine whether or not the regen has run.)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number       text,
  ADD COLUMN IF NOT EXISTS phone_verified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS sms_on_feedback    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_on_discussion  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_on_showcase    boolean NOT NULL DEFAULT false;
