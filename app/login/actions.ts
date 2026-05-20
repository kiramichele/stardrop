"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail, isValidUsername } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}