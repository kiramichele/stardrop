"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher, requireStudent } from "@/lib/auth";

// =============================================================
// Units
// =============================================================

export async function createUnit(formData: FormData) {
  await requireTeacher();
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  if (!title) throw new Error("Title required");

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("units")
    .select("order")
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.order ?? -1) + 1;

  const { data, error } = await supabase
    .from("units")
    .insert({ title, description, order: nextOrder })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create unit");

  revalidatePath("/teacher/lessons");
  redirect(`/teacher/lessons/units/${data.id}`);
}

export async function updateUnit(unitId: string, formData: FormData) {
  await requireTeacher();
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const published = formData.get("published") === "on";
  if (!title) throw new Error("Title required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("units")
    .update({ title, description, published })
    .eq("id", unitId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/units/${unitId}`);
}

export async function deleteUnit(unitId: string) {
  await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/lessons");
  redirect("/teacher/lessons");
}

// =============================================================
// Lessons
// =============================================================

export async function createLesson(unitId: string, formData: FormData) {
  await requireTeacher();
  const title = formData.get("title")?.toString().trim();
  const file = formData.get("html_file") as File | null;
  if (!title) throw new Error("Title required");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("lessons")
    .select("order")
    .eq("unit_id", unitId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (existing?.order ?? -1) + 1;

  const { data: lesson, error: insertError } = await supabase
    .from("lessons")
    .insert({ unit_id: unitId, title, order: nextOrder })
    .select("id")
    .single();
  if (insertError || !lesson) {
    throw new Error(insertError?.message ?? "Failed to create lesson");
  }

  if (file && file.size > 0) {
    await uploadLessonHtml(lesson.id, file);
  }

  revalidatePath(`/teacher/lessons/units/${unitId}`);
  redirect(`/teacher/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: string, formData: FormData) {
  await requireTeacher();
  const title = formData.get("title")?.toString().trim();
  const published = formData.get("published") === "on";
  const completionRequired =
    formData.get("completion_required_for_next") === "on";
  const file = formData.get("html_file") as File | null;
  if (!title) throw new Error("Title required");

  const supabase = await createClient();
  const { data: lesson, error: updateError } = await supabase
    .from("lessons")
    .update({
      title,
      published,
      completion_required_for_next: completionRequired,
    })
    .eq("id", lessonId)
    .select("unit_id")
    .single();
  if (updateError || !lesson) throw new Error(updateError?.message);

  if (file && file.size > 0) {
    await uploadLessonHtml(lessonId, file);
  }

  revalidatePath(`/teacher/lessons/units/${lesson.unit_id}`);
  revalidatePath(`/teacher/lessons/${lessonId}`);
}

/**
 * Swap a lesson's `order` with its immediate neighbour in the same unit.
 * Three-step swap (with a sentinel value of -1) so this stays correct
 * even if (unit_id, order) ever gets a unique constraint.
 */
export async function moveLesson(
  lessonId: string,
  direction: "up" | "down"
) {
  await requireTeacher();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("lessons")
    .select("id, unit_id, order")
    .eq("id", lessonId)
    .single();
  if (!current) return;

  let q = supabase
    .from("lessons")
    .select("id, order")
    .eq("unit_id", current.unit_id);
  if (direction === "up") {
    q = q.lt("order", current.order).order("order", { ascending: false });
  } else {
    q = q.gt("order", current.order).order("order", { ascending: true });
  }
  const { data: adjacent } = await q.limit(1).maybeSingle();
  if (!adjacent) return;

  await supabase.from("lessons").update({ order: -1 }).eq("id", current.id);
  await supabase.from("lessons").update({ order: current.order }).eq("id", adjacent.id);
  await supabase.from("lessons").update({ order: adjacent.order }).eq("id", current.id);

  revalidatePath(`/teacher/lessons/units/${current.unit_id}`);
}

export async function deleteLesson(lessonId: string) {
  await requireTeacher();
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("unit_id")
    .eq("id", lessonId)
    .single();

  const admin = createAdminClient();
  await admin.storage.from("lessons").remove([`${lessonId}.html`]);

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/lessons/units/${lesson?.unit_id}`);
  redirect(`/teacher/lessons/units/${lesson?.unit_id}`);
}

/**
 * Upload a lesson HTML file. Same pattern as interactive HTML:
 *   - Upload to Supabase Storage with text/html metadata
 *   - Save the PROXY URL (not the Supabase URL) to the DB
 *     so the iframe loads same-origin from stardrop.studio
 */
async function uploadLessonHtml(lessonId: string, file: File) {
  if (!file.name.toLowerCase().endsWith(".html")) {
    throw new Error("Lesson file must be an .html file");
  }

  const arrayBuffer = await file.arrayBuffer();
  const htmlBlob = new Blob([arrayBuffer], { type: "text/html" });

  const admin = createAdminClient();
  const storagePath = `${lessonId}.html`;

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
  await supabase
    .from("lessons")
    .update({ html_url: proxyUrl })
    .eq("id", lessonId);
}

// =============================================================
// Student: mark lesson complete
// =============================================================

export async function markLessonComplete(lessonId: string) {
  const user = await requireStudent();
  const supabase = await createClient();
  await supabase
    .from("lesson_completions")
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id" }
    );
  revalidatePath("/student/lessons");
  revalidatePath(`/student/lessons/${lessonId}`);
}

// =============================================================
// Student: lesson notes
// (Lives in /teacher/ alongside markLessonComplete for the same
// reason — student actions related to the lessons feature. Future
// cleanup: split into a real app/student/lessons/actions.ts.)
// =============================================================

/**
 * Save (or update) the current student's note for a lesson.
 * Upserts on the (user_id, lesson_id) unique constraint.
 *
 * DB column is `body`; the parameter is named `content` to match
 * the UI-facing terminology.
 */
export async function saveLessonNote(lessonId: string, content: string) {
  const user = await requireStudent();
  const supabase = await createClient();

  const { error } = await supabase.from("lesson_notes").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      body: content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/student/lessons/${lessonId}`);
  return { ok: true };
}