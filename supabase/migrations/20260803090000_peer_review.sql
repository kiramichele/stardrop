-- Peer review assignment type.
--
-- A peer_review assignment points at a SOURCE assignment (source_assignment_id):
-- students are paired (double-blind) and each reviews their partner's submission
-- to that source assignment, leaving written feedback. A student can only read
-- the feedback they RECEIVED once they've SUBMITTED the feedback they give.
--
-- NOTE on the enum: Postgres won't let a newly added enum value be *used* in the
-- same transaction it's added. This migration only adds the value (it isn't used
-- until app rows insert it later), so running the whole file at once is fine. If
-- your SQL editor still complains, run just the ALTER TYPE line first, then the
-- rest.

ALTER TYPE public.assignment_type ADD VALUE IF NOT EXISTS 'peer_review';

-- Which assignment's work is being reviewed.
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS source_assignment_id uuid
    REFERENCES public.assignments(id) ON DELETE SET NULL;

-- One row per reviewer→reviewee matchup. Pairs are two mutual rows; an odd
-- trio is a 3-row cycle (A→B, B→C, C→A). `body`/`submitted_at` fill in when the
-- reviewer turns their feedback in. Unique per (assignment, reviewer): each
-- student reviews exactly one classmate.
CREATE TABLE IF NOT EXISTS public.peer_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  reviewer_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body          text,
  submitted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS peer_reviews_assignment_idx
  ON public.peer_reviews (assignment_id);
CREATE INDEX IF NOT EXISTS peer_reviews_reviewee_idx
  ON public.peer_reviews (assignment_id, reviewee_id);

-- App reads/writes go through the service-role client with the give-to-get gate
-- enforced in code (same pattern as the rest of the teacher/student data).
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;
