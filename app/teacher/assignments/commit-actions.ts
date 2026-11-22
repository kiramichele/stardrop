"use server";

import { requireFullTeacher } from "@/lib/auth";
import type { CommitVersions } from "@/lib/commits";
import { loadCommitVersions } from "@/lib/commits-server";

/**
 * One student commit's code + its parent's, for the grading page's diff
 * view. Teacher-gated like the rest of the grading page (which also reads
 * submissions without per-class scoping).
 */
export async function getCommitVersionsForTeacher(
  commitId: string
): Promise<{ ok: true; versions: CommitVersions } | { ok: false; error: string }> {
  await requireFullTeacher();
  const v = await loadCommitVersions(commitId);
  if (!v) return { ok: false, error: "Commit not found" };
  return { ok: true, versions: { code: v.code, parentCode: v.parentCode } };
}
