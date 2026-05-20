-- The slideshow doubles as the day's class plan. This adds a free-text
-- note for the Period 3 async ("Personalized Learning") block.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.slideshows
  ADD COLUMN IF NOT EXISTS async_note text;
