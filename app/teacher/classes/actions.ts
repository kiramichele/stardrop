"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";
import { updateProfileColumns } from "@/lib/profile-server";
import { generatePassword } from "@/lib/csv";
import { sendNewPasswordEmail } from "@/lib/email";

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

// =============================================================
// Student profile moderation
// =============================================================

/**
 * Teacher-initiated password reset for a student who's locked out.
 * Sets a fresh password and emails it; also returns it so the teacher
 * can read it out in person if email isn't configured / didn't land.
 */
export async function resetStudentPassword(
  userId: string,
  classId: string
): Promise<
  | { ok: true; password: string; emailed: boolean }
  | { ok: false; error: string }
> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("users")
    .select("id, first_name, real_email, role")
    .eq("id", userId)
    .single();
  if (!student) return { ok: false, error: "Student not found" };

  const newPassword = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: error.message };

  let emailed = false;
  if (student.real_email) {
    const result = await sendNewPasswordEmail(
      student.real_email,
      student.first_name,
      newPassword
    );
    emailed = result.ok;
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, password: newPassword, emailed };
}

/**
 * Teacher removes a student's profile photo (moderation).
 */
export async function removeStudentAvatar(
  userId: string,
  classId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireTeacher();
  const admin = createAdminClient();
  await admin.storage.from("avatars").remove([userId]);
  const { error } = await updateProfileColumns(admin, userId, {
    avatar_url: null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true };
}