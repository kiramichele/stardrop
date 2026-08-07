"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFullTeacher, requireStudent } from "@/lib/auth";

// =============================================================
// Units
// =============================================================

export async function createUnit(formData: FormData) {
  await requireFullTeacher();
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
  await requireFullTeacher();
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
  await requireFullTeacher();
  const supabase = await createClient();
  const { error } = await supabase.from("units").delete().eq("id", unitId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/lessons");
  redirect("/teacher/lessons");
}

/**
 * Bulk delete units. Their lessons cascade away via FK; the lesson HTML
 * files are cleaned out of storage best-effort first so nothing's orphaned.
 */
export async function bulkDeleteUnits(
  unitIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireFullTeacher();
  if (unitIds.length === 0) {
    return { ok: false, error: "No units selected." };
  }

  const supabase = await createClient();

  // Storage cleanup: every lesson HTML file in these units.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .in("unit_id", unitIds);
  const lessonIds = (lessons ?? []).map((l) => l.id);
  if (lessonIds.length > 0) {
    const admin = createAdminClient();
    try {
      await admin.storage
        .from("lessons")
        .remove(lessonIds.map((id) => `${id}.html`));
    } catch {
      // ignore — the row delete below is what matters
    }
  }

  const { error } = await supabase.from("units").delete().in("id", unitIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/teacher/lessons");
  revalidatePath("/student/lessons");
  return { ok: true, count: unitIds.length };
}

// =============================================================
// Lessons
// =============================================================

export async function createLesson(unitId: string, formData: FormData) {
  await requireFullTeacher();
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
  await requireFullTeacher();
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
  await requireFullTeacher();
  // Use the service-role client: the swap is a set of UPDATEs, and lessons
  // RLS doesn't grant the teacher's session client UPDATE, so session writes
  // silently affect 0 rows. Matches deleteLesson / bulkDeleteUnits.
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("lessons")
    .select("id, unit_id, order")
    .eq("id", lessonId)
    .single();
  if (!current) return;

  // Find the neighbor in JS rather than filtering on the "order" column:
  // PostgREST treats `order` as its sort keyword, so `.lt("order", …)` /
  // `.gt("order", …)` collide with `.order("order")` and the lookup returns
  // nothing — which is why the arrows appeared to do nothing.
  const { data: siblings } = await admin
    .from("lessons")
    .select("id, order")
    .eq("unit_id", current.unit_id)
    .order("order");
  const list = siblings ?? [];
  const idx = list.findIndex((l) => l.id === current.id);
  if (idx === -1) return;
  const adjIdx = direction === "up" ? idx - 1 : idx + 1;
  if (adjIdx < 0 || adjIdx >= list.length) return;
  const adjacent = list[adjIdx];

  // Three-step swap through a sentinel so a (unit_id, order) unique index,
  // if one is ever added, never trips mid-swap.
  const r1 = await admin.from("lessons").update({ order: -1 }).eq("id", current.id);
  const r2 = await admin
    .from("lessons")
    .update({ order: current.order })
    .eq("id", adjacent.id);
  const r3 = await admin
    .from("lessons")
    .update({ order: adjacent.order })
    .eq("id", current.id);
  const err = r1.error || r2.error || r3.error;
  if (err) throw new Error(`Couldn't reorder lesson: ${err.message}`);

  revalidatePath(`/teacher/lessons/units/${current.unit_id}`);
}

export async function deleteLesson(lessonId: string) {
  await requireFullTeacher();
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

// =============================================================
// Student: lesson highlights
// A student selects text in the lesson and marks it in a color; the
// highlight is anchored by character offsets into the lesson body's text
// content and re-applied on return. Owner-scoped RLS means the session
// client only ever touches the student's own rows.
// =============================================================

// Not exported: a "use server" module may only export async functions.
const HIGHLIGHT_COLORS = ["yellow", "green", "pink", "blue"] as const;
type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export async function addHighlight(input: {
  lessonId: string;
  startOffset: number;
  endOffset: number;
  quote: string;
  color: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireStudent();

  const color: HighlightColor = HIGHLIGHT_COLORS.includes(
    input.color as HighlightColor
  )
    ? (input.color as HighlightColor)
    : "yellow";
  const start = Math.floor(input.startOffset);
  const end = Math.floor(input.endOffset);
  const quote = input.quote.trim();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    !quote
  ) {
    return { ok: false, error: "Invalid highlight range" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_highlights")
    .insert({
      user_id: user.id,
      lesson_id: input.lessonId,
      start_offset: start,
      end_offset: end,
      quote,
      color,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save highlight" };
  }
  return { ok: true, id: data.id };
}

export async function removeHighlight(
  highlightId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStudent();
  const supabase = await createClient();
  // RLS scopes the delete to the current student's own rows.
  const { error } = await supabase
    .from("lesson_highlights")
    .delete()
    .eq("id", highlightId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}