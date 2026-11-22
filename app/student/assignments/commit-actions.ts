"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import {
  MAX_COMMITS_PER_SUBMISSION,
  lineChangeStats,
  validateCommitMessage,
  type CommitSummary,
  type CommitVersions,
} from "@/lib/commits";
import {
  commitsTable,
  loadCommitHistory,
  loadCommitVersions,
} from "@/lib/commits-server";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Load the submission and confirm the signed-in student owns it. */
async function ownSubmission(submissionId: string) {
  const user = await requireStudent();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, assignment_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub || sub.user_id !== user.id) return null;
  return { user, sub, supabase };
}

export type CommitResult =
  | { ok: true; commit: CommitSummary }
  | { ok: false; error: string };

/**
 * Record a commit: a named snapshot of the student's code. Also writes the
 * same code to the draft so the working copy and the commit agree.
 */
export async function commitCode(
  submissionId: string,
  message: string,
  code: string,
  restoredFromId?: string | null
): Promise<CommitResult> {
  const owned = await ownSubmission(submissionId);
  if (!owned) return { ok: false, error: "Not authorized" };
  const { user, sub, supabase } = owned;

  const msgError = validateCommitMessage(message);
  if (msgError) return { ok: false, error: msgError };

  const { data: head } = await commitsTable()
    .select("id, code, code_hash")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const codeHash = hashCode(code);
  if (head && head.code_hash === codeHash) {
    return {
      ok: false,
      error: "Nothing to commit — your code hasn't changed since your last commit.",
    };
  }

  const { count } = await commitsTable()
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if ((count ?? 0) >= MAX_COMMITS_PER_SUBMISSION) {
    return {
      ok: false,
      error: `You've reached the limit of ${MAX_COMMITS_PER_SUBMISSION} commits for this assignment.`,
    };
  }

  // Only accept a restored-from pointer that belongs to this submission.
  let restoredFrom: { id: string; message: string } | null = null;
  if (restoredFromId) {
    const { data: src } = await commitsTable()
      .select("id, submission_id, message")
      .eq("id", restoredFromId)
      .maybeSingle();
    if (src && src.submission_id === submissionId) {
      restoredFrom = { id: src.id, message: src.message };
    }
  }

  const { data: created, error } = await commitsTable()
    .insert({
      submission_id: submissionId,
      assignment_id: sub.assignment_id,
      user_id: user.id,
      parent_id: head?.id ?? null,
      message: message.trim(),
      code,
      code_hash: codeHash,
      restored_from: restoredFrom?.id ?? null,
    })
    .select("id, message, created_at")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Commit failed" };
  }

  // Keep the autosaved draft in step with what was just committed.
  await supabase
    .from("submissions")
    .update({ content: code })
    .eq("id", submissionId);

  const stats = lineChangeStats(head?.code ?? "", code);
  return {
    ok: true,
    commit: {
      id: created.id,
      message: created.message,
      createdAt: created.created_at,
      added: stats.added,
      removed: stats.removed,
      restoredFromMessage: restoredFrom?.message ?? null,
    },
  };
}

/**
 * The History list, newest first, plus the latest commit's code so the
 * editor can tell whether there are uncommitted changes.
 */
export async function listCommits(submissionId: string): Promise<
  | { ok: true; commits: CommitSummary[]; headCode: string | null }
  | { ok: false; error: string }
> {
  const owned = await ownSubmission(submissionId);
  if (!owned) return { ok: false, error: "Not authorized" };
  const history = await loadCommitHistory(submissionId);
  if (!history) return { ok: false, error: "Couldn't load history" };
  return { ok: true, ...history };
}

/** One commit's code + its parent's — for the diff view and Restore. */
export async function getCommitVersions(
  commitId: string
): Promise<{ ok: true; versions: CommitVersions } | { ok: false; error: string }> {
  const user = await requireStudent();
  const v = await loadCommitVersions(commitId);
  if (!v || v.userId !== user.id) {
    return { ok: false, error: "Commit not found" };
  }
  return { ok: true, versions: { code: v.code, parentCode: v.parentCode } };
}
