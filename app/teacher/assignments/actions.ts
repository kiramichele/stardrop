"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher, getCurrentUser } from "@/lib/auth";
import { sendEmail, escapeHtml } from "@/lib/email";
import { feedbackMessages } from "@/lib/feedback-server";
import { computeAutoGrade, type AssignmentType } from "@/lib/assignments";
import { asProfile } from "@/lib/profile";
import type { Json } from "@/types/database";

const VALID_TYPES: AssignmentType[] = [
  "code",
  "interactive_html",
  "short_answer",
  "discussion",
  "unity_upload",
  "check_in",
];

function parseMinimumWordCount(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export async function createAssignment(formData: FormData) {
  await requireTeacher();

  const classId = formData.get("class_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  const type = formData.get("type")?.toString() as AssignmentType;
  const instructions = formData.get("instructions")?.toString().trim() || null;
  const dueDateRaw = formData.get("due_date")?.toString();
  const pointsRaw = formData.get("points")?.toString();
  const lessonId = formData.get("lesson_id")?.toString() || null;
  const minWordsRaw = formData.get("minimum_word_count")?.toString();
  const rubricIdRaw = formData.get("rubric_id")?.toString();
  const rubricId = rubricIdRaw && rubricIdRaw !== "" ? rubricIdRaw : null;

  if (!classId) throw new Error("Class required");
  if (!title) throw new Error("Title required");
  if (!VALID_TYPES.includes(type)) throw new Error("Invalid assignment type");

  const points = pointsRaw ? Number.parseInt(pointsRaw, 10) : 100;
  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;
  const minimumWordCount = parseMinimumWordCount(minWordsRaw);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      lesson_id: lessonId,
      title,
      type,
      instructions,
      due_date: dueDate,
      points,
      minimum_word_count: minimumWordCount,
      rubric_id: rubricId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create");

  revalidatePath("/teacher/assignments");
  redirect(`/teacher/assignments/${data.id}`);
}

export async function updateAssignment(
  assignmentId: string,
  formData: FormData
) {
  await requireTeacher();

  const title = formData.get("title")?.toString().trim();
  const instructions = formData.get("instructions")?.toString().trim() || null;
  const dueDateRaw = formData.get("due_date")?.toString();
  const pointsRaw = formData.get("points")?.toString();
  const published = formData.get("published") === "on";
  const minWordsRaw = formData.get("minimum_word_count")?.toString();
  const rubricIdRaw = formData.get("rubric_id")?.toString();
  const rubricId = rubricIdRaw && rubricIdRaw !== "" ? rubricIdRaw : null;

  if (!title) throw new Error("Title required");
  const points = pointsRaw ? Number.parseInt(pointsRaw, 10) : 100;
  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;
  const minimumWordCount = parseMinimumWordCount(minWordsRaw);

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({
      title,
      instructions,
      due_date: dueDate,
      points,
      published,
      minimum_word_count: minimumWordCount,
      rubric_id: rubricId,
    })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/assignments/${assignmentId}`);
}

export async function deleteAssignment(assignmentId: string) {
  await requireTeacher();
  const supabase = await createClient();

  const admin = createAdminClient();
  await admin.storage.from("lessons").remove([`assignments/${assignmentId}.html`]);

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/assignments");
  redirect("/teacher/assignments");
}

// =============================================================
// Interactive HTML upload
// =============================================================

export async function uploadInteractiveHtml(
  assignmentId: string,
  formData: FormData
) {
  await requireTeacher();
  const file = formData.get("html_file") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided");
  if (!file.name.toLowerCase().endsWith(".html")) {
    throw new Error("File must be an .html file");
  }

  const arrayBuffer = await file.arrayBuffer();
  const htmlBlob = new Blob([arrayBuffer], { type: "text/html" });

  const admin = createAdminClient();
  const storagePath = `assignments/${assignmentId}.html`;

  const { error: uploadError } = await admin.storage
    .from("lessons")
    .upload(storagePath, htmlBlob, {
      cacheControl: "60",
      upsert: true,
      contentType: "text/html",
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const proxyUrl = `/api/files/lessons/${storagePath}`;

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ interactive_html_url: proxyUrl })
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/assignments/${assignmentId}`);
}

// =============================================================
// Grading
// =============================================================

export async function saveGrade(submissionId: string, formData: FormData) {
  await requireTeacher();

  const scoreRaw = formData.get("score")?.toString();
  const feedback = formData.get("feedback")?.toString().trim() || null;
  const rubricScoresRaw = formData.get("rubric_scores_json")?.toString();

  if (!scoreRaw) throw new Error("Score required");
  const score = Number.parseFloat(scoreRaw);
  if (Number.isNaN(score)) throw new Error("Score must be a number");

  // When the assignment has an attached rubric, the GradingForm posts a JSON
  // map of criterion_id -> earned_points alongside the auto-summed score.
  let rubricScores: Record<string, number> | null = null;
  if (rubricScoresRaw) {
    try {
      const parsed = JSON.parse(rubricScoresRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const clean: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
        }
        rubricScores = clean;
      }
    } catch {
      // ignore malformed payload — fall back to score-only grade
    }
  }

  const supabase = await createClient();

  const { error: gradeError } = await supabase
    .from("grades")
    .upsert(
      {
        submission_id: submissionId,
        score,
        feedback,
        graded_at: new Date().toISOString(),
        rubric_scores: rubricScores as unknown as Json,
      },
      { onConflict: "submission_id" }
    );
  if (gradeError) throw new Error(gradeError.message);

  const { data: sub, error: subError } = await supabase
    .from("submissions")
    .update({ status: "graded" })
    .eq("id", submissionId)
    .select("assignment_id")
    .single();
  if (subError) throw new Error(subError.message);

  revalidatePath(`/teacher/assignments/${sub.assignment_id}`);
  revalidatePath(
    `/teacher/assignments/${sub.assignment_id}/grade/${submissionId}`
  );
}

// =============================================================
// Feedback thread (replies on top of a grade's initial feedback)
//
// Used by both the teacher's grade page and the student's
// assignment page. Auth: students may only reply on their own
// graded submission; teachers may reply any time.
// =============================================================

export async function addFeedbackMessage(
  submissionId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authorized" };

  const body = formData.get("body")?.toString().trim();
  if (!body) return { ok: false, error: "Message cannot be empty" };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select("id, user_id, status, assignment_id")
    .eq("id", submissionId)
    .single();
  if (!sub) return { ok: false, error: "Submission not found" };

  if (user.role !== "teacher") {
    // Students can only reply on their own submission, and only once graded
    if (sub.user_id !== user.id) {
      return { ok: false, error: "Not authorized" };
    }
    if (sub.status !== "graded") {
      return {
        ok: false,
        error: "You can only reply once your work has been graded.",
      };
    }
  }

  const { error: insertError } = await feedbackMessages(admin).insert({
    submission_id: submissionId,
    author_id: user.id,
    body,
  });
  if (insertError) return { ok: false, error: insertError.message };

  // Best-effort notification: when a student replies, ping the teacher(s)
  if (user.role === "student") {
    void notifyTeachersOfStudentReply({
      submissionId,
      assignmentId: sub.assignment_id,
      author: user,
      body,
    });
  }

  revalidatePath(`/student/assignments/${sub.assignment_id}`);
  revalidatePath(
    `/teacher/assignments/${sub.assignment_id}/grade/${submissionId}`
  );
  return { ok: true };
}

// =============================================================
// Bulk grading
// =============================================================

type BulkResult =
  | { ok: true; graded: number; skipped: number }
  | { ok: false; error: string };

/**
 * Grade one submission. Returns true if it was graded, false if skipped
 * because it already had a grade and `overwrite` was false.
 */
async function gradeOne(
  admin: ReturnType<typeof createAdminClient>,
  submissionId: string,
  score: number,
  overwrite: boolean
): Promise<boolean> {
  if (!overwrite) {
    const { data: existing } = await admin
      .from("grades")
      .select("submission_id")
      .eq("submission_id", submissionId)
      .maybeSingle();
    if (existing) return false;
  }
  const { error: gradeError } = await admin.from("grades").upsert(
    {
      submission_id: submissionId,
      score,
      graded_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" }
  );
  if (gradeError) throw new Error(gradeError.message);
  await admin
    .from("submissions")
    .update({ status: "graded" })
    .eq("id", submissionId);
  return true;
}

export async function autoGradeInteractive(
  assignmentId: string,
  overwrite: boolean
): Promise<BulkResult> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("points, type")
    .eq("id", assignmentId)
    .single();
  if (!assignment) return { ok: false, error: "Assignment not found" };
  if (assignment.type !== "interactive_html") {
    return {
      ok: false,
      error: "Auto-grade only works on Interactive HTML assignments.",
    };
  }

  const { data: submissions } = await admin
    .from("submissions")
    .select("id, structured_data")
    .eq("assignment_id", assignmentId);

  let graded = 0;
  let skipped = 0;
  for (const sub of submissions ?? []) {
    const auto = computeAutoGrade(sub.structured_data, assignment.points);
    if (!auto) {
      skipped++;
      continue;
    }
    const did = await gradeOne(admin, sub.id, auto.autoPoints, overwrite);
    if (did) graded++;
    else skipped++;
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, graded, skipped };
}

export async function fullCreditAll(
  assignmentId: string,
  overwrite: boolean
): Promise<BulkResult> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("points")
    .eq("id", assignmentId)
    .single();
  if (!assignment) return { ok: false, error: "Assignment not found" };

  const { data: submissions } = await admin
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId);

  let graded = 0;
  let skipped = 0;
  for (const sub of submissions ?? []) {
    const did = await gradeOne(admin, sub.id, assignment.points, overwrite);
    if (did) graded++;
    else skipped++;
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, graded, skipped };
}

export async function applyScoreToSubmissions(
  assignmentId: string,
  submissionIds: string[],
  score: number,
  overwrite: boolean
): Promise<BulkResult> {
  await requireTeacher();
  if (submissionIds.length === 0) {
    return { ok: false, error: "No submissions selected" };
  }
  if (!Number.isFinite(score) || score < 0) {
    return { ok: false, error: "Score must be 0 or higher" };
  }

  const admin = createAdminClient();
  let graded = 0;
  let skipped = 0;
  for (const id of submissionIds) {
    const did = await gradeOne(admin, id, score, overwrite);
    if (did) graded++;
    else skipped++;
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, graded, skipped };
}

export async function zeroNonSubmitters(
  assignmentId: string
): Promise<{ ok: true; zeroed: number } | { ok: false; error: string }> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("class_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment) return { ok: false, error: "Assignment not found" };

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("user_id")
    .eq("class_id", assignment.class_id);
  const enrolledIds = (enrollments ?? []).map((e) => e.user_id);

  const { data: submissions } = await admin
    .from("submissions")
    .select("id, user_id, status")
    .eq("assignment_id", assignmentId);
  const subByUser = new Map(
    (submissions ?? []).map((s) => [s.user_id, s])
  );

  let zeroed = 0;
  for (const userId of enrolledIds) {
    const existing = subByUser.get(userId);
    // Leave anyone who actually submitted, or is already graded
    if (
      existing &&
      (existing.status === "submitted" || existing.status === "graded")
    ) {
      continue;
    }

    let submissionId: string;
    if (existing) {
      submissionId = existing.id; // a never-submitted draft — grade it 0
    } else {
      const { data: created, error } = await admin
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          user_id: userId,
          status: "graded",
        })
        .select("id")
        .single();
      if (error || !created) continue;
      submissionId = created.id;
    }
    await gradeOne(admin, submissionId, 0, true);
    zeroed++;
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, zeroed };
}

export async function batchAddFeedback(
  assignmentId: string,
  submissionIds: string[],
  body: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { ok: false, error: "Not authorized" };
  }
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Feedback cannot be empty" };
  if (submissionIds.length === 0) {
    return { ok: false, error: "No submissions selected" };
  }

  const admin = createAdminClient();
  let count = 0;
  for (const id of submissionIds) {
    const { error } = await feedbackMessages(admin).insert({
      submission_id: id,
      author_id: user.id,
      body: trimmed,
    });
    if (!error) count++;
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return { ok: true, count };
}

async function notifyTeachersOfStudentReply(args: {
  submissionId: string;
  assignmentId: string;
  author: { first_name: string; last_name: string };
  body: string;
}) {
  const admin = createAdminClient();
  const { data: teachers } = await admin
    .from("users")
    .select("*")
    .eq("role", "teacher");
  const recipients = (teachers ?? [])
    .map((t) => asProfile(t))
    .filter(
      (t) =>
        t.email_notifications && !!t.real_email && t.real_email.includes("@")
    )
    .map((t) => t.real_email as string);
  if (recipients.length === 0) return;

  const { data: assignment } = await admin
    .from("assignments")
    .select("title")
    .eq("id", args.assignmentId)
    .maybeSingle();
  const title = assignment?.title ?? "an assignment";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const link = appUrl
    ? `${appUrl}/teacher/assignments/${args.assignmentId}/grade/${args.submissionId}`
    : null;

  const fullName = `${args.author.first_name} ${args.author.last_name}`.trim();
  const subject = `${args.author.first_name || "A student"} replied to your feedback`;
  const bodyHtml = escapeHtml(args.body).replace(/\n/g, "<br>");

  await sendEmail({
    to: recipients,
    subject,
    html: `
      <p>${escapeHtml(fullName)} replied to your feedback on <strong>${escapeHtml(title)}</strong>:</p>
      <blockquote style="margin:0 0 1em;padding:0.5em 1em;border-left:3px solid #cdb088;color:#555;">
        ${bodyHtml}
      </blockquote>
      ${link ? `<p><a href="${link}">View in Stardrop</a></p>` : ""}
    `.trim(),
    text: `${fullName} replied to your feedback on ${title}:\n\n${args.body}${link ? `\n\n${link}` : ""}`,
  });
}