"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import type { Database, Json } from "@/types/database";

type SubmissionUpdate = Database["public"]["Tables"]["submissions"]["Update"];

/**
 * Payload for save/submit — supports both code (content) and
 * interactive HTML / structured types (structured_data).
 */
export type DraftPayload = {
  content?: string;
  structured_data?: Json | null;
};

/**
 * Ensure a submission row exists for this student + assignment.
 * Returns the submission id, status, content, and structured_data.
 */
export async function ensureSubmission(assignmentId: string) {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status, content, structured_data")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("submissions")
    .insert({ assignment_id: assignmentId, user_id: user.id, status: "draft" })
    .select("id, status, content, structured_data")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create submission");
  }
  return created;
}

function buildUpdate(payload: DraftPayload): SubmissionUpdate {
  const update: SubmissionUpdate = {};
  if (payload.content !== undefined) update.content = payload.content;
  if (payload.structured_data !== undefined) {
    update.structured_data = payload.structured_data;
  }
  return update;
}

/**
 * Save draft content. Allowed unless submission is graded.
 */
export async function saveDraft(submissionId: string, payload: DraftPayload) {
  const user = await requireStudent();
  const supabase = await createClient();

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

  const update = buildUpdate(payload);
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("submissions")
    .update(update)
    .eq("id", submissionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Submit (or re-submit). Sets status='submitted', stamps submitted_at on first submit.
 */
export async function submitAssignment(
  submissionId: string,
  payload: DraftPayload
) {
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

  const update: SubmissionUpdate = {
    ...buildUpdate(payload),
    status: "submitted",
  };
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