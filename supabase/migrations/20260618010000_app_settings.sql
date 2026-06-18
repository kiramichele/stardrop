-- Generic key/value bag for teacher-controlled feature toggles. Right
-- now there's exactly one: a kill switch for the Unity simulation Run
-- button so the teacher can turn it off until the class has covered it.
--
-- Storing as jsonb keeps the door open for future flags (lists,
-- objects, numeric thresholds) without another column-add migration.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read settings — students need to see whether
-- the Unity button is currently available.
DROP POLICY IF EXISTS "auth read app_settings" ON public.app_settings;
CREATE POLICY "auth read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only teachers can write. (The server uses the service-role admin
-- client and bypasses RLS, so this is a belt-and-braces guard.)
DROP POLICY IF EXISTS "teachers write app_settings" ON public.app_settings;
CREATE POLICY "teachers write app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Seed the Unity simulation flag as enabled so nothing changes for
-- existing users until the teacher flips it.
INSERT INTO public.app_settings (key, value)
VALUES ('unity_simulation_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
