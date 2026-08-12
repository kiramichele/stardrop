-- "Practice" assignments: gradeable (score + feedback, same as any other
-- assignment) but excluded from every average-percentage calculation —
-- struggling-students, the unit/class heatmap, a student's own Grades
-- page, and their teacher-facing profile. Same idea as an excusal, but
-- set once on the assignment itself rather than per student.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.assignments
  ADD COLUMN is_practice boolean NOT NULL DEFAULT false;
