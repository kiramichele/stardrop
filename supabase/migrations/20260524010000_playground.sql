-- Playground: a code sandbox + per-assignment "run / simulate" toggle.
--
-- Two things ship together:
--   1. assignments.code_run_mode — which run buttons (if any) show for
--      that assignment's submission. Values:
--        'none'   — no run buttons (legacy / submission-only)
--        'csharp' — only "Run as C#" (Piston compile + execute)
--        'unity'  — only "Simulate in Unity" (Claude narrates what the
--                   script would do in the Unity Editor)
--        'both'   — both buttons shown (DEFAULT)
--   2. playground_programs — student-saved code snippets. Sharable by
--      direct link to /playground/<id> (requires login like the rest of
--      the app, but any logged-in user can open the link — that's the
--      whole point of "send the link to me in chat").
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS code_run_mode text NOT NULL DEFAULT 'both';

CREATE TABLE IF NOT EXISTS public.playground_programs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  -- shiki / Monaco language id (csharp, javascript, etc.)
  language   text NOT NULL DEFAULT 'csharp',
  code       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playground_programs_user_idx
  ON public.playground_programs (user_id, updated_at DESC);

-- All access goes through the admin client (we authorize at the action
-- layer). RLS on, no policies — closed to anon/authenticated direct.
ALTER TABLE public.playground_programs ENABLE ROW LEVEL SECURITY;
