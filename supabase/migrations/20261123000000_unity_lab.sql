-- Unity Lab: a simplified, browser-only "Unity Editor" (Hierarchy,
-- Inspector, Scene view, MonoBehaviour scripts) where Play asks Claude to
-- simulate the scene. Practice only — nothing here is graded.
--
-- Also retires "Simulate in Unity" as an assignment run mode: Unity
-- practice now lives in the Lab (the Playground keeps its own Unity
-- simulation for now).
--
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

-- One row per saved scene. The whole scene (objects, components, scripts)
-- is a single JSON document — it's small and always loaded/saved whole.
CREATE TABLE IF NOT EXISTS public.unity_lab_scenes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  scene      jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unity_lab_scenes_user_idx
  ON public.unity_lab_scenes (user_id, updated_at DESC);

-- One row per Play (AI simulation) — used for the per-student hourly
-- rate limit, and handy for seeing how much the Lab gets used.
CREATE TABLE IF NOT EXISTS public.unity_lab_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unity_lab_runs_user_idx
  ON public.unity_lab_runs (user_id, created_at DESC);

-- All access goes through server actions on the admin client (authorized
-- at the action layer). RLS on, no policies — closed to direct access.
ALTER TABLE public.unity_lab_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unity_lab_runs ENABLE ROW LEVEL SECURITY;

-- Assignments no longer offer a Unity run mode. Any row still on 'unity'
-- (or the legacy 'both', which meant Unity) becomes plain C#.
UPDATE public.assignments
  SET code_run_mode = 'csharp'
  WHERE code_run_mode IN ('unity', 'both');
ALTER TABLE public.assignments
  ALTER COLUMN code_run_mode SET DEFAULT 'csharp';
