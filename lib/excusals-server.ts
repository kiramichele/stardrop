import { createAdminClient } from "@/lib/supabase/admin";

// Excused assignments. An excusal is one (assignment, student) pair.
// Read helpers return Sets for cheap membership checks; the write helper
// inserts/removes a row.

/** Assignment ids the given student is excused from. */
export async function getExcusalsForStudent(
  userId: string
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignment_excusals")
    .select("assignment_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.assignment_id));
}

/** Every excusal as "userId::assignmentId" keys — for whole-class analytics. */
export async function getAllExcusals(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignment_excusals")
    .select("assignment_id, user_id");
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
  const admin = createAdminClient();
  if (excused) {
    const { error } = await admin
      .from("assignment_excusals")
      .upsert(
        { assignment_id: assignmentId, user_id: userId },
        { onConflict: "assignment_id,user_id" }
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin
      .from("assignment_excusals")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
