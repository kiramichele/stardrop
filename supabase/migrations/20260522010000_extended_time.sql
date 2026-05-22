-- Extended-time accommodations.
--
-- Each student sits in one extended-time tier: regular, 1.5x, or 2x.
-- An assignment carries up to three due dates -- the regular one plus an
-- optional 1.5x and 2x date -- and a student is held to the date for
-- their tier (falling back to the regular date when a tier date is blank).
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

-- The inline CHECK rides along with ADD COLUMN IF NOT EXISTS, so the whole
-- statement is a no-op on re-run.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS extended_time text NOT NULL DEFAULT 'none'
    CHECK (extended_time IN ('none', '1.5x', '2x'));

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS due_date_1_5x timestamptz,
  ADD COLUMN IF NOT EXISTS due_date_2x timestamptz;
