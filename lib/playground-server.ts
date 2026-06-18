import { createAdminClient } from "@/lib/supabase/admin";
import type { PlaygroundProgram } from "@/lib/playground";

// playground_programs isn't in the regenerated types until the matching
// migration is applied + a regen runs. Same shim pattern as the other
// recent migrations so the build is safe either way.

type Admin = ReturnType<typeof createAdminClient>;
type DbError = { message: string } | null;

interface SelectChain<T> extends PromiseLike<{ data: T[] | null; error: DbError }> {
  eq(col: string, val: string): SelectChain<T>;
  order(col: string, opts?: { ascending?: boolean }): SelectChain<T>;
  limit(n: number): SelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: DbError }>;
}

interface MutateChain extends PromiseLike<{ error: DbError }> {
  eq(col: string, val: string): MutateChain;
}

interface ShimTable<T> {
  select(cols: string): SelectChain<T>;
  insert(row: Record<string, unknown>): PromiseLike<{ error: DbError }>;
  update(patch: Record<string, unknown>): MutateChain;
  delete(): MutateChain;
}

function shim<T>(admin: Admin, name: string): ShimTable<T> {
  return (admin as unknown as { from: (t: string) => ShimTable<T> }).from(name);
}

// =============================================================
// Reads
// =============================================================

/** Every saved program owned by a user, most-recently-updated first. */
export async function getProgramsForUser(
  userId: string
): Promise<PlaygroundProgram[]> {
  const admin = createAdminClient();
  const { data } = await shim<PlaygroundProgram>(admin, "playground_programs")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

/** One saved program (any owner) — used for share-by-link views. */
export async function getProgram(
  programId: string
): Promise<PlaygroundProgram | null> {
  const admin = createAdminClient();
  const { data } = await shim<PlaygroundProgram>(admin, "playground_programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  return data;
}

// =============================================================
// Writes
// =============================================================

export async function insertProgramRecord(
  userId: string,
  args: { title: string; language: string; code: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await shim<PlaygroundProgram>(
    admin,
    "playground_programs"
  ).insert({
    id,
    user_id: userId,
    title: args.title,
    language: args.language,
    code: args.code,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export async function updateProgramRecord(
  programId: string,
  userId: string,
  isTeacher: boolean,
  patch: Partial<{ title: string; language: string; code: string }>
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const existing = await getProgram(programId);
  if (!existing) return { ok: false, error: "Program not found" };
  if (!isTeacher && existing.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await shim<PlaygroundProgram>(
    admin,
    "playground_programs"
  )
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", programId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteProgramRecord(
  programId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const existing = await getProgram(programId);
  if (!existing) return { ok: false, error: "Program not found" };
  if (!isTeacher && existing.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await shim<PlaygroundProgram>(
    admin,
    "playground_programs"
  )
    .delete()
    .eq("id", programId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
