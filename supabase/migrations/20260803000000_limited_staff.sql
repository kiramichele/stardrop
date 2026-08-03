-- Limited-staff teacher accounts (e.g. an assistant principal): they sign in
-- like a teacher and can browse assignments/lessons and reset student
-- passwords, but the app hides grades, analytics, and full student profiles.
-- Enforced in the app layer (requireFullTeacher + scoped views); this column
-- is the single flag that drives it.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS limited_staff boolean NOT NULL DEFAULT false;
