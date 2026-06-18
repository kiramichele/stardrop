import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Generic teacher-controlled feature toggles. Keys are plain strings;
// add a typed getter/setter pair per setting so callers don't have to
// remember the key.

type Shim = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string
      ) => {
        maybeSingle: () => Promise<{ data: { value: unknown } | null }>;
      };
    };
    upsert: (row: {
      key: string;
      value: unknown;
      updated_at: string;
    }) => Promise<{ error: unknown }>;
  };
};

const UNITY_KEY = "unity_simulation_enabled";

/**
 * Whether students can click "Simulate in Unity" right now. Defaults
 * to true if the row hasn't been seeded yet (so a missing migration
 * doesn't silently hide the button). Cached per request — multiple
 * components on the same page share one DB round-trip.
 */
export const getUnitySimulationEnabled = cache(
  async (): Promise<boolean> => {
    const admin = createAdminClient() as unknown as Shim;
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", UNITY_KEY)
      .maybeSingle();
    if (!data) return true;
    return data.value === true;
  }
);

/** Flip the Unity simulation flag. Teacher-only (auth checked at the action layer). */
export async function setUnitySimulationEnabled(enabled: boolean): Promise<void> {
  const admin = createAdminClient() as unknown as Shim;
  const { error } = await admin.from("app_settings").upsert({
    key: UNITY_KEY,
    value: enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(
      typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Couldn't update setting"
    );
  }
}
