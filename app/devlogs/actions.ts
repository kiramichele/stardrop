"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  setSubmissionPublicRecord,
  toggleSubmissionLikeRecord,
  insertSubmissionCommentRecord,
  deleteSubmissionCommentRecord,
} from "@/lib/devlog-wall-server";

const COMMENT_MAX = 2000;

/** Owner or teacher: share to / hide from the devlogs wall. */
export async function setDevlogPublic(
  submissionId: string,
  isPublic: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await setSubmissionPublicRecord(
    submissionId,
    user.id,
    user.role === "teacher",
    isPublic
  );
  if (result.ok) {
    revalidatePath("/devlogs");
    revalidatePath("/student/assignments");
  }
  return result;
}

/** Like / unlike a public devlog. */
export async function toggleDevlogLike(
  submissionId: string
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const user = await requireUser();
  const result = await toggleSubmissionLikeRecord(submissionId, user.id);
  if (result.ok) revalidatePath("/devlogs");
  return result;
}

/** Post a comment or reply on a devlog. */
export async function addDevlogComment(
  submissionId: string,
  body: string,
  parentId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const clean = body.trim().slice(0, COMMENT_MAX);
  if (!clean) return { ok: false, error: "Write something first." };
  const result = await insertSubmissionCommentRecord(
    submissionId,
    user.id,
    clean,
    parentId
  );
  if (result.ok) revalidatePath("/devlogs");
  return result;
}

/** Soft-delete a comment. Author or teacher only. */
export async function deleteDevlogComment(
  commentId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await deleteSubmissionCommentRecord(
    commentId,
    user.id,
    user.role === "teacher"
  );
  if (result.ok) revalidatePath("/devlogs");
  return { ok: result.ok, error: result.error };
}
