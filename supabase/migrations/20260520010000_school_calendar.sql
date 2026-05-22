-- School calendar: student-facing dates for GCA SY26-27.
-- Seeded from the GCA 2026-27 School Calendar PDF. Read-only in the app
-- (no editor UI yet) -- RLS on with no policies so only the service-role
-- admin client can touch it.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  end_date date,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'holiday', 'teacher_workday', 'testing', 'event',
    'student_date', 'eld', 'async'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_date_idx
  ON public.calendar_events (event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Seed -- only when the table is empty, so this migration is safe to re-run.
-- Multi-day windows carry an end_date; single days leave it null.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.calendar_events) THEN
    INSERT INTO public.calendar_events (event_date, end_date, title, category, note) VALUES
      ('2026-07-03', NULL, 'Independence Day Holiday', 'holiday', NULL),
      ('2026-08-03', NULL, 'First Day of School', 'student_date', NULL),
      ('2026-08-03', '2026-08-07', 'iReady BOY Diagnostic (K-5)', 'testing', NULL),
      ('2026-08-04', '2026-08-07', 'NWEA MAP Tests (6-12) & Course Pre-Tests', 'testing', NULL),
      ('2026-08-26', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2026-09-07', NULL, 'Labor Day', 'holiday', NULL),
      ('2026-09-16', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2026-09-28', '2026-10-02', 'Interim Assessment #1', 'testing', NULL),
      ('2026-10-09', NULL, 'Async Day', 'async', NULL),
      ('2026-10-12', '2026-10-13', 'Fall Break', 'holiday', NULL),
      ('2026-10-21', NULL, 'School-wide F2F & Virtual Events Community Day', 'event', NULL),
      ('2026-10-23', NULL, 'PSAT/NMSQT', 'testing', NULL),
      ('2026-11-04', NULL, 'Apply to College Day', 'student_date', NULL),
      ('2026-11-09', '2026-11-13', 'iReady MOY Diagnostic (K-5)', 'testing', NULL),
      ('2026-11-11', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2026-11-12', NULL, 'Async Day', 'async', NULL),
      ('2026-11-13', NULL, 'Async Day', 'async', NULL),
      ('2026-11-23', '2026-11-27', 'Thanksgiving Break', 'holiday', NULL),
      ('2026-11-30', '2026-12-04', 'Winter EOC Administration', 'testing', NULL),
      ('2026-12-07', '2026-12-11', '1st Semester Final Exams', 'testing', NULL),
      ('2026-12-17', NULL, 'Makeup Testing', 'testing', NULL),
      ('2026-12-18', NULL, 'Last Day of 1st Semester', 'student_date', 'Early release'),
      ('2026-12-21', '2027-01-01', 'Winter Break', 'holiday', NULL),
      ('2027-01-04', NULL, 'Teacher Work Day', 'teacher_workday', NULL),
      ('2027-01-05', NULL, 'First Day of 2nd Semester', 'student_date', 'Async Day'),
      ('2027-01-18', NULL, 'Martin Luther King Jr. Day', 'holiday', NULL),
      ('2027-01-27', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2027-02-01', '2027-02-05', 'Write Score', 'testing', NULL),
      ('2027-02-08', '2027-02-26', 'ACCESS Testing', 'testing', NULL),
      ('2027-02-15', '2027-02-16', 'Winter Break (Presidents Day)', 'holiday', NULL),
      ('2027-02-24', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2027-03-01', '2027-03-05', 'Interim Assessment #3', 'testing', NULL),
      ('2027-03-08', '2027-03-19', 'Gifted Testing', 'testing', NULL),
      ('2027-03-10', NULL, 'Career Day', 'student_date', NULL),
      ('2027-03-12', NULL, 'Async Day', 'async', NULL),
      ('2027-03-22', '2027-03-26', 'iReady EOY Diagnostic (K-5)', 'testing', NULL),
      ('2027-03-24', NULL, 'Enhanced Learning Day', 'eld', NULL),
      ('2027-04-05', '2027-04-09', 'Spring Break', 'holiday', NULL),
      ('2027-04-14', NULL, 'School-wide F2F & Virtual Events Community Day', 'event', NULL),
      ('2027-04-26', '2027-04-28', 'Milestones Testing Materials Pick Up', 'event', NULL),
      ('2027-04-29', '2027-05-07', 'Georgia Milestones Spring EOG/EOC Administration', 'testing', NULL),
      ('2027-05-03', '2027-05-14', 'AP Test Administration', 'testing', NULL),
      ('2027-05-10', '2027-05-14', 'Final Exams', 'testing', NULL),
      ('2027-05-14', NULL, 'Seniors Honors Day & Prom', 'student_date', NULL),
      ('2027-05-15', NULL, 'Senior Graduation', 'student_date', NULL),
      ('2027-05-17', '2027-05-18', 'NWEA MAP (6-12)', 'testing', NULL),
      ('2027-05-17', '2027-05-18', 'Final Exam Make-ups', 'testing', NULL),
      ('2027-05-18', NULL, 'Last Day of School', 'student_date', NULL),
      ('2027-05-19', '2027-05-21', 'Teacher Work Days', 'teacher_workday', NULL),
      ('2027-05-31', NULL, 'Memorial Day', 'holiday', NULL),
      ('2027-06-18', NULL, 'Juneteenth Observed', 'holiday', NULL),
      ('2027-06-28', '2027-07-02', 'Summer EOC/EOG Assessment Administration', 'testing', NULL);
  END IF;
END $$;
