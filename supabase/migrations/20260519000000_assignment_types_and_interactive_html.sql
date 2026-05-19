-- Add support for interactive HTML assignments and the four assignment
-- types that lib/assignments.ts already references. Run via:
--   supabase db push
-- and then regenerate types:
--   npx supabase gen types typescript --project-id <ref> > types/database.ts

-- 1. Expand the assignment_type enum.
--    Existing values: 'code', 'written', 'discussion', 'upload'.
--    'written' and 'upload' are currently unused by the application code —
--    leave them in place; dropping enum values in Postgres requires a full
--    type swap which isn't worth the migration risk right now.
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'interactive_html';
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'short_answer';
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'unity_upload';
ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'check_in';

-- 2. interactive_html_url on assignments — public URL of the uploaded
--    interactive HTML file (Supabase Storage). NULL means "no file
--    uploaded yet", which the application treats as "not ready for students".
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS interactive_html_url TEXT;

-- 3. structured_data on submissions — JSONB payload posted from the
--    interactive HTML iframe (via the stardrop:save / stardrop:complete
--    postMessage protocol). Free-form per assignment; the iframe owns the shape.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS structured_data JSONB;
