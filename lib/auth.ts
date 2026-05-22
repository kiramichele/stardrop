import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FAKE_EMAIL_DOMAIN = "stardrop.local";

/**
 * Convert a username to the fake email used as the auth identifier.
 * "kira" -> "kira@stardrop.local"
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${FAKE_EMAIL_DOMAIN}`;
}

/**
 * Validate username format: lowercase alphanumeric only.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9]+$/.test(username);
}

/**
 * Get the current authenticated user with their public.users profile.
 * Returns null if not signed in or no profile row exists.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Require an authenticated user. Redirects to /login if not signed in.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a teacher. Redirects students to /student.
 */
export async function requireTeacher() {
  const user = await requireUser();
  if (user.role !== "teacher") redirect("/student");
  return user;
}

/**
 * Require a student. Redirects teachers to /teacher.
 */
export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "student") redirect("/teacher");
  return user;
}