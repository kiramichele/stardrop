"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail, isValidUsername } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { appBaseUrl, sendPasswordResetRequestEmail } from "@/lib/email";

export type LoginState = { error?: string } | null;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = formData.get("username")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!username || !password) {
    return { error: "Username and password required." };
  }

  if (!isValidUsername(username)) {
    return { error: "Invalid username." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "Invalid username or password." };
  }

  // Look up role to route to the right dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Something went wrong. Try again." };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Bounce back to wherever they were headed before being sent to /login,
  // falling back to their role's dashboard.
  const next = safeRedirectPath(formData.get("next")?.toString());
  const dashboard = profile?.role === "teacher" ? "/teacher" : "/student";

  revalidatePath("/", "layout");
  redirect(next ?? dashboard);
}

/**
 * "Forgot password" from the sign-in page. Looks the student up by
 * username and emails the teacher to reset it — it never resets a
 * password itself, so it can't be used to lock anyone out.
 */
export async function requestPasswordReset(
  username: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = username.trim().toLowerCase();
  if (!clean || !isValidUsername(clean)) {
    return {
      ok: false,
      error: "Enter a valid username — letters and numbers only.",
    };
  }

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id, first_name, last_name, username")
    .eq("username", clean)
    .maybeSingle();
  if (!user) {
    return {
      ok: false,
      error:
        "We couldn't find that username. Check the spelling, or ask your teacher in class.",
    };
  }

  // The student's class, so the teacher's email links straight to the roster.
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("class_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const base = appBaseUrl();
  const link = base
    ? `${base}/teacher/classes${
        enrollment?.class_id ? `/${enrollment.class_id}` : ""
      }`
    : "";

  const { data: teachers } = await admin
    .from("users")
    .select("real_email")
    .eq("role", "teacher");
  const recipients = (teachers ?? [])
    .map((t) => t.real_email)
    .filter((e): e is string => !!e && e.includes("@"));

  const studentName =
    `${user.first_name} ${user.last_name}`.trim() || user.username;

  if (recipients.length > 0) {
    await sendPasswordResetRequestEmail(
      recipients,
      studentName,
      user.username,
      link
    );
  }

  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}