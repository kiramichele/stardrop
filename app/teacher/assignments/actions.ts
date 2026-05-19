"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";
import type { AssignmentType } from "@/lib/assignments";

const VALID_TYPES: AssignmentType[] = [
  "code",
  "interactive_html",
  "short_answer",
  "discussion",
  "unity_upload",
  "check_in",
];

export async function createAssignment(formData: FormData) {
  await requireTeacher();

  const classId = formData.get("class_id")?.toString();
  const title = formData.get("title")?.toString().trim();
  const type = formData.get("type")?.toString() as AssignmentType;
  const instructions = formData.get("instructions")?.toString().trim() || null;
  const dueDateRaw = formData.get("due_date")?.toString();
  const pointsRaw = formData.get("points")?.toString();
  const lessonId = formData.get("lesson_id")?.toString() || null;

  if (!classId) throw new Error("Class required");
  if (!title) throw new Error("Title required");
  if (!VALID_TYPES.includes(type)) throw new Error("Invalid assignment type");

  const points = pointsRaw ? Number.parseInt(pointsRaw, 10) : 100;
  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

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

  if (!title) throw new Error("Title required");
  const points = pointsRaw ? Number.parseInt(pointsRaw, 10) : 100;
  const dueDate = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ title, instructions, due_date: dueDate, points, published })
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
//
// Re-wrap the uploaded file as a Blob with an explicit text/html
// MIME type. Without this, Supabase Storage sometimes stores the
// content type as text/plain or application/octet-stream depending
// on the browser's File metadata, and browsers show source code
// instead of rendering the HTML.
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

  // Re-wrap as a text/html Blob to guarantee correct Content-Type
  const arrayBuffer = await file.arrayBuffer();
  const htmlBlob = new Blob([arrayBuffer], { type: "text/html" });

  const admin = createAdminClient();
  const path = `assignments/${assignmentId}.html`;

  const { error: uploadError } = await admin.storage
    .from("lessons")
    .upload(path, htmlBlob, {
      cacheControl: "60",
      upsert: true,
      contentType: "text/html",
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = admin.storage.from("lessons").getPublicUrl(path);

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ interactive_html_url: urlData.publicUrl })
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

  if (!scoreRaw) throw new Error("Score required");
  const score = Number.parseFloat(scoreRaw);
  if (Number.isNaN(score)) throw new Error("Score must be a number");

  const supabase = await createClient();

  const { error: gradeError } = await supabase
    .from("grades")
    .upsert(
      {
        submission_id: submissionId,
        score,
        feedback,
        graded_at: new Date().toISOString(),
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