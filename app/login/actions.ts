"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail, isValidUsername } from "@/lib/auth";

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

  revalidatePath("/", "layout");
  redirect(profile?.role === "teacher" ? "/teacher" : "/student");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}