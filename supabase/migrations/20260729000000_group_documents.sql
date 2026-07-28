-- Real-time collaborative coding: the shared document a group edits together.
--
-- One row per group holds the live Yjs document (base64 state) plus the plain
-- code text (used when the group submits). Edits sync peer-to-peer over
-- Supabase Realtime; this row is the durable base new joiners load and the
-- debounced autosave target.
--
-- Also adds a per-assignment "only the leader submits" toggle.
--
-- Access model: RLS on, no policies — reached only by the service-role admin
-- client from server actions that check group membership (same as the other
-- group tables).
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked | Out-File -Encoding utf8 types/database.ts

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS leader_submits_only boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.group_documents (
  group_id   uuid PRIMARY KEY REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
  state      text,
  content    text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_documents ENABLE ROW LEVEL SECURITY;
