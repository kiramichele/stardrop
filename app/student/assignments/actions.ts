"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";

/**
 * Ensure a submission row exists for this student + assignment.
 * Returns the submission id and current status.
 */
export async function ensureSubmission(assignmentId: string) {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status, content")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("submissions")
    .insert({ assignment_id: assignmentId, user_id: user.id, status: "draft" })
    .select("id, status, content")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create submission");
  }
  return created;
}

/**
 * Save draft content. Allowed unless submission is graded.
 */
export async function saveDraft(submissionId: string, content: string) {
  const user = await requireStudent();
  const supabase = await createClient();

  // Verify ownership and not-graded
  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }
  if (sub.status === "graded") {
    return { ok: false, error: "Submission already graded — can't edit." };
  }

  const { error } = await supabase
    .from("submissions")
    .update({ content })
    .eq("id", submissionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Submit (or re-submit). Sets status='submitted', stamps submitted_at on first submit.
 */
export async function submitAssignment(submissionId: string, content: string) {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, status, submitted_at, assignment_id")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }
  if (sub.status === "graded") {
    return { ok: false, error: "Submission already graded — can't edit." };
  }

  const update: {
    content: string;
    status: "submitted";
    submitted_at?: string;
  } = {
    content,
    status: "submitted",
  };
  // Stamp submitted_at only on first submit; resubmits keep the original
  if (!sub.submitted_at) {
    update.submitted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("submissions")
    .update(update)
    .eq("id", submissionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/student/assignments/${sub.assignment_id}`);
  revalidatePath("/student/assignments");
  return { ok: true };
}

/**
 * Log a paste event from the code editor.
 */
export async function logPasteEvent(
  submissionId: string,
  content: string,
  length: number
) {
  const user = await requireStudent();
  const supabase = await createClient();

  // Verify ownership (cheap)
  const { data: sub } = await supabase
    .from("submissions")
    .select("user_id")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.user_id !== user.id) return { ok: false };

  await supabase.from("submission_events").insert({
    submission_id: submissionId,
    event_type: "paste",
    payload: { content, length },
  });
  return { ok: true };
}