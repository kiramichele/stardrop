import { createAdminClient } from "@/lib/supabase/admin";

// `classes.color` isn't in types/database.ts until a regen runs (and a
// regen only keeps it once the migration is applied). These two helpers
// read/write the column through a typed cast so the app builds either way.

type Admin = ReturnType<typeof createAdminClient>;
type ClassColorRow = { id: string; color: string | null };

/** classId -> color key, for every class that has a color set. */
export async function getClassColorMap(): Promise<Map<string, string>> {
  const admin = createAdminClient();
  const { data } = await (
    admin as unknown as {
      from: (t: string) => {
        select: (
          c: string
        ) => Promise<{ data: ClassColorRow[] | null }>;
      };
    }
  )
    .from("classes")
    .select("id, color");

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.color) map.set(row.id, row.color);
  }
  return map;
}

/** Set (or clear, with null) a class's color tag. */
export async function setClassColorRecord(
  classId: string,
  color: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin: Admin = createAdminClient();
  const { error } = await (
    admin as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (
            c: string,
            v: string
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("classes")
    .update({ color })
    .eq("id", classId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
