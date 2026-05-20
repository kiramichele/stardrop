"use server";

import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Mark the current student as having been through the first-login
 * orientation, so it doesn't auto-open on their dashboard again.
 */
export async function markOnboarded(): Promise<void> {
  const user = await requireStudent();
  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
}
