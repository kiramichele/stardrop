-- Student-controlled opt-in for a no-login-required share link to their
-- StarHub portfolio (served at /portfolio/[username]). Off by default —
-- same "share with class" spirit as the existing per-post is_public
-- toggles, just one level up (the whole page, not one piece of work).
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.users
  ADD COLUMN portfolio_public boolean NOT NULL DEFAULT false;
