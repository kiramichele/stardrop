-- Student SIS ID on users + a stored Canvas gradebook template.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

-- The district / SIS student number. Used to match an app student to a
-- row of an exported Canvas gradebook when filling in grades for export.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS student_id text;

-- A CSV exported from Canvas, kept as the "format template" for gradebook
-- exports. The newest row wins; re-uploading just inserts a fresher one.
-- RLS is on with no policies, so only the service-role (admin) client
-- reaches it -- same pattern as assignment_excusals. All access happens
-- on requireTeacher()-gated routes.
CREATE TABLE IF NOT EXISTS public.gradebook_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  csv_text text NOT NULL,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gradebook_template ENABLE ROW LEVEL SECURITY;
