"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudent } from "@/lib/auth";
import { parseSubmissionMedia, type SubmissionMedia } from "@/lib/assignments";
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

// =============================================================
// Devlog submissions
// -------------------------------------------------------------
// Devlog videos can be hundreds of MB, so the browser uploads them
// straight to the `devlogs` bucket (bypassing the server-action body
// limit). Two thin actions wrap that: one to mint the submission row /
// storage prefix before the upload, and one to record the final file
// and mark the submission submitted afterward.
// =============================================================

/**
 * Create the draft submission and hand back the IDs the browser needs
 * to upload to `devlogs/<userId>/<submissionId>/<file>`.
 */
export async function prepareDevlogSubmission(
  assignmentId: string
): Promise<
  | { ok: true; submissionId: string; userId: string }
  | { ok: false; error: string }
> {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "graded") {
      return { ok: false, error: "Submission already graded — can't replace." };
    }
    return { ok: true, submissionId: existing.id, userId: user.id };
  }

  const { data: created, error } = await supabase
    .from("submissions")
    .insert({ assignment_id: assignmentId, user_id: user.id, status: "draft" })
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Couldn't start a submission." };
  }
  return { ok: true, submissionId: created.id, userId: user.id };
}

/**
 * Record the just-uploaded devlog file as THE submission's media and
 * mark the submission submitted. Any prior devlog file for this
 * submission is removed from storage so we never accumulate.
 */
export async function finalizeDevlogSubmission(
  submissionId: string,
  args: { fileId: string; storagePath: string; mime: string; size: number }
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, status, submitted_at, assignment_id, uploaded_files")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }
  if (sub.status === "graded") {
    return { ok: false, error: "Submission already graded — can't replace." };
  }

  const admin = createAdminClient();

  // Clear any prior devlog file so we never accumulate stale uploads.
  const previous = parseSubmissionMedia(sub.uploaded_files).filter(
    (m) => m.bucket === "devlogs" && m.storagePath !== args.storagePath
  );
  if (previous.length > 0) {
    try {
      await admin.storage
        .from("devlogs")
        .remove(previous.map((m) => m.storagePath));
    } catch {
      // best-effort — the DB update below is what matters
    }
  }

  const media: SubmissionMedia = {
    id: args.fileId,
    kind: "video",
    storagePath: args.storagePath,
    mime: args.mime,
    size: args.size,
    createdAt: new Date().toISOString(),
    bucket: "devlogs",
  };

  const update: SubmissionUpdate = {
    uploaded_files: [media] as unknown as Json,
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

// =============================================================
// Unity-upload media: capture + manage attached files
// =============================================================

function extFor(kind: "image" | "video", mime: string): string {
  if (kind === "image") return mime === "image/jpeg" ? "jpg" : "png";
  if (mime === "video/mp4") return "mp4";
  return "webm";
}

/**
 * Upload one screenshot or video recording to the submissions bucket and
 * append a reference to the submission row. Creates the submission lazily
 * on first upload, matching the same pattern as ensureSubmission().
 */
export async function uploadSubmissionMedia(
  assignmentId: string,
  formData: FormData
): Promise<
  | { ok: true; media: SubmissionMedia; submissionId: string }
  | { ok: false; error: string }
> {
  const user = await requireStudent();

  const kindRaw = formData.get("kind")?.toString();
  const kind: "image" | "video" = kindRaw === "video" ? "video" : "image";
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file provided" };

  const supabase = await createClient();

  // Ensure submission row exists (and get its current uploaded_files)
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status, uploaded_files")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  let submissionId: string;
  let status: "draft" | "submitted" | "graded";
  let currentList: SubmissionMedia[];
  if (existing) {
    submissionId = existing.id;
    status = existing.status;
    currentList = parseSubmissionMedia(existing.uploaded_files);
  } else {
    const { data: created, error } = await supabase
      .from("submissions")
      .insert({
        assignment_id: assignmentId,
        user_id: user.id,
        status: "draft",
      })
      .select("id, status")
      .single();
    if (error || !created) {
      return { ok: false, error: error?.message ?? "Failed to create submission" };
    }
    submissionId = created.id;
    status = created.status;
    currentList = [];
  }

  if (status === "graded") {
    return { ok: false, error: "Submission already graded — can't edit." };
  }

  // Upload to private bucket via admin client
  const fileId = crypto.randomUUID();
  const mime = file.type || (kind === "video" ? "video/webm" : "image/png");
  const storagePath = `${submissionId}/${fileId}.${extFor(kind, mime)}`;

  const bytes = await file.arrayBuffer();
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("submissions")
    .upload(storagePath, bytes, {
      contentType: mime,
      cacheControl: "60",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const media: SubmissionMedia = {
    id: fileId,
    kind,
    storagePath,
    mime,
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  const nextList = [...currentList, media];

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ uploaded_files: nextList as unknown as Json })
    .eq("id", submissionId);
  if (updateError) {
    // Roll back the storage upload to keep the row and bucket in sync
    await admin.storage.from("submissions").remove([storagePath]);
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true, media, submissionId };
}

/**
 * Remove a single media file from a submission. Allowed unless graded.
 */
export async function removeSubmissionMedia(
  submissionId: string,
  mediaId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, status, assignment_id, uploaded_files")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.user_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }
  if (sub.status === "graded") {
    return { ok: false, error: "Submission already graded — can't edit." };
  }

  const list = parseSubmissionMedia(sub.uploaded_files);
  const target = list.find((m) => m.id === mediaId);
  if (!target) return { ok: false, error: "File not found" };

  await createAdminClient()
    .storage.from("submissions")
    .remove([target.storagePath]);

  const nextList = list.filter((m) => m.id !== mediaId);
  const { error } = await supabase
    .from("submissions")
    .update({ uploaded_files: nextList as unknown as Json })
    .eq("id", submissionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/student/assignments/${sub.assignment_id}`);
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

/**
 * Activity heartbeat from an assignment editor — one ping per active
 * minute the student spends working. Powers time-on-task analytics.
 * No-ops until the student has a submission row to attach events to.
 */
export async function recordActivityPing(
  assignmentId: string
): Promise<{ ok: boolean }> {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return { ok: false };

  await supabase.from("submission_events").insert({
    submission_id: sub.id,
    event_type: "keystroke_batch",
    payload: { activeMs: 60000 },
  });
  return { ok: true };
}