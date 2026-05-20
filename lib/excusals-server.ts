import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================
// `assignment_excusals` isn't in types/database.ts (and a types
// regen drops any hand-add), so this file talks to the table through
// a small typed shim. Once the table is in the generated types, the
// shim can be replaced with admin.from("assignment_excusals").
// =============================================================
type ExcusalRow = { assignment_id: string; user_id: string };

type ExcusalsRead = Promise<{ data: ExcusalRow[] | null }> & {
  eq: (col: string, val: string) => Promise<{ data: ExcusalRow[] | null }>;
};

type ExcusalsTable = {
  select: (cols: string) => ExcusalsRead;
  upsert: (
    row: { assignment_id: string; user_id: string },
    opts: { onConflict: string }
  ) => Promise<{ error: { message: string } | null }>;
  delete: () => {
    eq: (
      col: string,
      val: string
    ) => {
      eq: (
        col: string,
        val: string
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
};

function excusalsTable(
  admin: ReturnType<typeof createAdminClient>
): ExcusalsTable {
  return (
    admin as unknown as { from: (t: string) => ExcusalsTable }
  ).from("assignment_excusals");
}

/** Assignment ids the given student is excused from. */
export async function getExcusalsForStudent(
  userId: string
): Promise<Set<string>> {
  const { data } = await excusalsTable(createAdminClient())
    .select("assignment_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.assignment_id));
}

/** Every excusal as "userId::assignmentId" keys — for whole-class analytics. */
export async function getAllExcusals(): Promise<Set<string>> {
  const { data } = await excusalsTable(createAdminClient()).select(
    "assignment_id, user_id"
  );
  return new Set(
    (data ?? []).map((r) => `${r.user_id}::${r.assignment_id}`)
  );
}

/** Excuse (insert) or un-excuse (delete) one student from one assignment. */
export async function setExcused(
  assignmentId: string,
  userId: string,
  excused: boolean
): Promise<{ ok: boolean; error?: string }> {
  const table = excusalsTable(createAdminClient());
  if (excused) {
    const { error } = await table.upsert(
      { assignment_id: assignmentId, user_id: userId },
      { onConflict: "assignment_id,user_id" }
    );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await table
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
