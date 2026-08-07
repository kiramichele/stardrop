-- Students can turn in a revision at any point, even after a submission
-- has been graded (previously locked). Teachers can additionally flag a
-- submission for revision explicitly; the flag clears itself the next time
-- the student resubmits.
alter table public.submissions
  add column revision_requested_at timestamptz;
