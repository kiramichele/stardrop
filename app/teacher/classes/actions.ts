"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher, requireFullTeacher } from "@/lib/auth";
import { updateProfileColumns } from "@/lib/profile-server";
import { setClassColorRecord } from "@/lib/class-colors-server";
import { isClassColorKey } from "@/lib/class-colors";
import { generatePassword, uniqueUsername } from "@/lib/csv";
import { usernameToEmail, isValidUsername } from "@/lib/auth";
import { asExtendedTime } from "@/lib/assignments";
import { sendNewPasswordEmail } from "@/lib/email";

// =============================================================
// Class CRUD
// =============================================================

export async function updateClass(classId: string, formData: FormData) {
  await requireFullTeacher();

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

/** Set or clear a class's color tag. Pass null to clear it. */
export async function setClassColor(
  classId: string,
  color: string | null
): Promise<{ ok: boolean; error?: string }> {
  await requireFullTeacher();

  if (color !== null && !isClassColorKey(color)) {
    return { ok: false, error: "Unknown color." };
  }

  const result = await setClassColorRecord(classId, color);
  if (!result.ok) return result;

  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/teacher/grading");
  return { ok: true };
}

export async function deleteClass(classId: string) {
  await requireFullTeacher();
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
  await requireFullTeacher();
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
  await requireFullTeacher();
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

// =============================================================
// Manually add a single student to a class
// =============================================================

/**
 * Create one student account from teacher-entered fields and enroll them in
 * the class. Mirrors the per-row logic in importRoster: generate a unique
 * username (unless the teacher typed one) + a memorable password, create the
 * auth user against a fake username@stardrop.local email, insert the profile,
 * and enroll. Returns the credentials so the teacher can hand them out — the
 * password isn't stored in readable form anywhere else.
 */
export async function addStudentToClass(
  classId: string,
  formData: FormData
): Promise<
  | { ok: true; username: string; password: string }
  | { ok: false; error: string }
> {
  await requireFullTeacher();
  const admin = createAdminClient();

  const firstName = (formData.get("first_name") ?? "").toString().trim();
  const lastName = (formData.get("last_name") ?? "").toString().trim();
  const email = (formData.get("real_email") ?? "").toString().trim();
  const studentId = (formData.get("student_id") ?? "").toString().trim();
  const extendedTime = asExtendedTime(formData.get("extended_time"));
  const usernameInput = (formData.get("username") ?? "")
    .toString()
    .trim()
    .toLowerCase();

  if (!firstName || !lastName) {
    return { ok: false, error: "First and last name are required." };
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }

  const { data: klass } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .single();
  if (!klass) return { ok: false, error: "Class not found." };

  // Resolve the username: honor a valid, free one the teacher typed;
  // otherwise auto-generate from the name (jsmith, jsmith2, …).
  let username: string;
  if (usernameInput) {
    if (!isValidUsername(usernameInput)) {
      return {
        ok: false,
        error: "Username can only contain lowercase letters and numbers.",
      };
    }
    const { data: taken } = await admin
      .from("users")
      .select("id")
      .eq("username", usernameInput)
      .maybeSingle();
    if (taken) {
      return { ok: false, error: `The username "${usernameInput}" is taken.` };
    }
    username = usernameInput;
  } else {
    username = await uniqueUsername(admin, firstName, lastName, new Set());
  }

  const password = generatePassword();

  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });
  if (authError || !authUser.user) {
    return {
      ok: false,
      error: `Could not create the account: ${authError?.message ?? "unknown error"}`,
    };
  }

  const { error: profileError } = await admin.from("users").insert({
    id: authUser.user.id,
    username,
    real_email: email || null,
    first_name: firstName,
    last_name: lastName,
    role: "student",
    student_id: studentId || null,
    extended_time: extendedTime,
  });
  if (profileError) {
    // Don't leave an orphaned auth user behind.
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { ok: false, error: `Could not save the profile: ${profileError.message}` };
  }

  const { error: enrollError } = await admin
    .from("enrollments")
    .insert({ user_id: authUser.user.id, class_id: classId });
  if (enrollError) {
    // The account is valid; only the enrollment failed. Surface it rather
    // than deleting a good account.
    return {
      ok: false,
      error: `Student created, but adding them to the class failed: ${enrollError.message}`,
    };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, username, password };
}

// =============================================================
// Bulk login export (for handing out / emailing sign-in info)
// =============================================================

/** RFC-4180-ish CSV field escaping: quote when it contains , " or newline. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export a class roster's sign-in info as CSV.
 *
 * Existing passwords can't be read back (Supabase stores them hashed), so
 * for any student who has never signed in we set a fresh password and put it
 * in the file. Students who have already signed in keep their current
 * password and appear with a blank password cell — they don't need a new one.
 *
 * Nothing is emailed here; the teacher hands out / mail-merges the CSV.
 */
export async function exportClassLogins(classId: string): Promise<
  | {
      ok: true;
      csv: string;
      className: string;
      resetCount: number;
      activeCount: number;
      failed: string[];
    }
  | { ok: false; error: string }
> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: klass } = await admin
    .from("classes")
    .select("name")
    .eq("id", classId)
    .single();
  if (!klass) return { ok: false, error: "Class not found" };

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("users(id, first_name, last_name, username, role)")
    .eq("class_id", classId);

  const students = (enrollments ?? [])
    .map((e) => (Array.isArray(e.users) ? e.users[0] : e.users))
    .filter(
      (u): u is {
        id: string;
        first_name: string;
        last_name: string;
        username: string;
        role: string;
      } => !!u && u.role === "student"
    )
    .sort((a, b) => {
      const ln = (a.last_name || "").localeCompare(b.last_name || "");
      return ln !== 0 ? ln : (a.first_name || "").localeCompare(b.first_name || "");
    });

  if (students.length === 0) {
    return { ok: false, error: "This class has no students yet." };
  }

  // Map every auth user's id -> whether they've ever signed in.
  const signedIn = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.last_sign_in_at) signedIn.add(u.id);
    }
    if (data.users.length < 1000) break;
  }

  let resetCount = 0;
  let activeCount = 0;
  const failed: string[] = [];
  const lines = ["first_name,last_name,username,password"];

  for (const s of students) {
    let password = "";
    if (signedIn.has(s.id)) {
      activeCount += 1;
    } else {
      const newPassword = generatePassword();
      const { error } = await admin.auth.admin.updateUserById(s.id, {
        password: newPassword,
      });
      if (error) {
        failed.push(`${s.first_name} ${s.last_name}`.trim());
      } else {
        password = newPassword;
        resetCount += 1;
      }
    }
    lines.push(
      [s.first_name, s.last_name, s.username, password]
        .map((v) => csvField(v ?? ""))
        .join(",")
    );
  }

  return {
    ok: true,
    csv: lines.join("\n") + "\n",
    className: klass.name,
    resetCount,
    activeCount,
    failed,
  };
}

/**
 * Teacher removes a student's profile photo (moderation).
 */
export async function removeStudentAvatar(
  userId: string,
  classId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireFullTeacher();
  const admin = createAdminClient();
  await admin.storage.from("avatars").remove([userId]);
  const { error } = await updateProfileColumns(admin, userId, {
    avatar_url: null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true };
}