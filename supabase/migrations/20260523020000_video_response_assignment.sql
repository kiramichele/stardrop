-- Video response assignment type: flexible in-browser recording
-- (camera + mic, screen + mic, screen + mic + camera PIP) or an
-- uploaded video. Great for first-day intros and any prompt that
-- benefits from a video answer.
--
-- Reuses the existing `devlogs` storage bucket + proxy + RLS — the
-- bucket is just where short student videos live; the assignment
-- type decides what UI the student sees.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'video_response';
