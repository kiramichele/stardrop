"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth";

// =============================================================
// Class CRUD
// =============================================================

export async function updateClass(classId: string, formData: FormData) {
  await requireTeacher();

  const name = formData.get("name")?.toString().trim();
  const periodRaw = formData.get("period_number")?.toString();
  const term = formData.get("term")?.toString().trim();

  if (!name) throw new Error("Name required");
  if (!term) throw new Error("Term required");

  const periodNumber = periodRaw && periodRaw !== "" ? Number.parseInt(periodRaw, 10) : null;
  if (periodNumber !== null && ![1, 2, 4, 5].includes(periodNumber)) {
    throw new Error("Period must be 1, 2, 4, or 5");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ name, period_number: periodNumber, term })
    .eq("id", classId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function deleteClass(classId: string) {
  await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/classes");
  redirect("/teacher/classes");
}

// =============================================================
// Enrollment management
// =============================================================

/**
 * Move a student from one class to another.
 * Implemented as: remove from source + upsert into target (handles
 * the case where the student is somehow already in the target).
 */
export async function moveStudent(
  userId: string,
  fromClassId: string,
  toClassId: string
) {
  await requireTeacher();
  if (fromClassId === toClassId) return;

  const supabase = await createClient();

  // Remove from source
  const { error: removeError } = await supabase
    .from("enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("class_id", fromClassId);
  if (removeError) throw new Error(removeError.message);

  // Add to target (upsert handles edge case where they're already enrolled)
  const { error: addError } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: userId, class_id: toClassId },
      { onConflict: "user_id,class_id", ignoreDuplicates: true }
    );
  if (addError) throw new Error(addError.message);

  revalidatePath(`/teacher/classes/${fromClassId}`);
  revalidatePath(`/teacher/classes/${toClassId}`);
  revalidatePath("/teacher/classes");
}

/**
 * Remove a student from a class. Deletes the enrollment but keeps the user.
 */
export async function removeStudentFromClass(userId: string, classId: string) {
  await requireTeacher();
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("user_id", userId)
    .eq("class_id", classId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/classes");
}