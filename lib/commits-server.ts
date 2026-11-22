import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_COMMITS_PER_SUBMISSION,
  lineChangeStats,
  type CommitSummary,
} from "@/lib/commits";

// Server-side reads/writes for code_commits. NOT server actions — every
// caller authorizes first (student ownership or teacher role).
//
// code_commits isn't in the regenerated types until the matching migration
// is applied + a regen runs — same shim pattern as lib/playground-server.ts
// so the build is safe either way.

type Admin = ReturnType<typeof createAdminClient>;
type DbError = { message: string } | null;

interface SelectChain<T>
  extends PromiseLike<{
    data: T[] | null;
    error: DbError;
    count?: number | null;
  }> {
  eq(col: string, val: string): SelectChain<T>;
  order(col: string, opts?: { ascending?: boolean }): SelectChain<T>;
  limit(n: number): SelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: DbError }>;
}

interface ShimTable<T> {
  select(
    cols: string,
    opts?: { count?: "exact"; head?: boolean }
  ): SelectChain<T>;
  insert(row: Record<string, unknown>): {
    select(cols: string): {
      single(): PromiseLike<{ data: T | null; error: DbError }>;
    };
  };
}

export type CommitRow = {
  id: string;
  submission_id: string;
  assignment_id: string;
  user_id: string;
  parent_id: string | null;
  message: string;
  code: string;
  code_hash: string;
  restored_from: string | null;
  created_at: string;
};

export function commitsTable(admin: Admin = createAdminClient()) {
  return (
    admin as unknown as { from: (t: string) => ShimTable<CommitRow> }
  ).from("code_commits");
}

/** True when the submission has at least one commit (submit gate). */
export async function submissionHasCommit(submissionId: string): Promise<boolean> {
  const { count } = await commitsTable()
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  return (count ?? 0) > 0;
}

/**
 * A submission's history, newest first, plus the latest commit's code.
 * Returns null on a database error.
 */
export async function loadCommitHistory(
  submissionId: string
): Promise<{ commits: CommitSummary[]; headCode: string | null } | null> {
  const { data, error } = await commitsTable()
    .select("id, parent_id, message, code, restored_from, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(MAX_COMMITS_PER_SUBMISSION);
  if (error) return null;

  const rows = data ?? [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const commits = rows.map((r): CommitSummary => {
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    const stats = lineChangeStats(parent?.code ?? "", r.code);
    return {
      id: r.id,
      message: r.message,
      createdAt: r.created_at,
      added: stats.added,
      removed: stats.removed,
      restoredFromMessage: r.restored_from
        ? (byId.get(r.restored_from)?.message ?? null)
        : null,
    };
  });
  return { commits, headCode: rows[0]?.code ?? null };
}

/**
 * One commit's code plus its parent's code (empty for the first commit),
 * for the "What changed" diff. Includes user_id so callers can authorize.
 */
export async function loadCommitVersions(commitId: string): Promise<{
  userId: string;
  code: string;
  parentCode: string;
} | null> {
  const { data } = await commitsTable()
    .select("user_id, parent_id, code")
    .eq("id", commitId)
    .maybeSingle();
  if (!data) return null;
  let parentCode = "";
  if (data.parent_id) {
    const { data: parent } = await commitsTable()
      .select("code")
      .eq("id", data.parent_id)
      .maybeSingle();
    parentCode = parent?.code ?? "";
  }
  return { userId: data.user_id, code: data.code, parentCode };
}
