-- Collaborative coding: let a coding assignment be worked in groups.
--
-- This migration adds the assignment-level config + the group tables. The
-- actual shared submission/editing is a later change; here we just model who
-- is in which group.
--
-- Assignments are stored per class (one copy each), so the config columns are
-- set identically on every copy and each copy's groups are its own class's
-- groups — students group within their class.
--
-- Access model: RLS is ON with no policies on both tables, so only the
-- service-role admin client reaches them. All reads/writes go through server
-- actions that enforce requireTeacher()/requireStudent() + enrollment — same
-- pattern as playground_programs / student_notes.
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

-- 1. Per-assignment collaborative config.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS collaborative  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_mode     text
    CHECK (group_mode IN ('random', 'manual', 'choice')),
  ADD COLUMN IF NOT EXISTS max_group_size integer CHECK (max_group_size > 0),
  ADD COLUMN IF NOT EXISTS allow_solo     boolean NOT NULL DEFAULT false;

-- 2. Groups belonging to one assignment (one class's copy).
CREATE TABLE IF NOT EXISTS public.assignment_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  name          text,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  is_solo       boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignment_groups_assignment_idx
  ON public.assignment_groups (assignment_id);

ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;

-- 3. Membership. UNIQUE (assignment_id, user_id) => at most one group per
--    student per assignment. assignment_id is denormalized to support that.
CREATE TABLE IF NOT EXISTS public.group_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_group_idx
  ON public.group_members (group_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
