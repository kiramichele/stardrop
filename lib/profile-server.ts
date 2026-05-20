import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileColumnsUpdate = Partial<{
  avatar_url: string | null;
  email_notifications: boolean;
  reduced_motion: boolean;
}>;

/** Update profile columns on a user row. */
export async function updateProfileColumns(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  patch: ProfileColumnsUpdate
): Promise<{ error: { message: string } | null }> {
  return admin.from("users").update(patch).eq("id", userId);
}
