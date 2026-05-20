-- Daily class slideshows: one per date, shared across all periods.
-- Carries an optional agenda note and links to lessons/assignments.
-- HTML files reuse the existing `lessons` storage bucket under a
-- slideshows/ prefix, served via the /api/files/lessons/ proxy.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.slideshows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_date date NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  html_url text,
  lesson_ids uuid[] NOT NULL DEFAULT '{}',
  assignment_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
