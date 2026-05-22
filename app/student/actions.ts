"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mark the current student as having been through the first-login
 * orientation, so it doesn't auto-open on their dashboard again.
 *
 * Uses the admin client on purpose: the `users` table's RLS doesn't grant
 * students UPDATE on their own row, so the user-scoped client silently
 * updated zero rows and the tour kept reappearing. requireStudent() plus
 * scoping the update to the caller's own id keeps this safe.
 */
export async function markOnboarded(): Promise<void> {
  const user = await requireStudent();
  const admin = createAdminClient();
  await admin
    .from("users")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/student");
}
