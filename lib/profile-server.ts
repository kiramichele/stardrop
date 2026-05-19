import { createAdminClient } from "@/lib/supabase/admin";

// TEMPORARY shim: write the new profile columns on `users` until
// types/database.ts is regenerated after the user_profile_fields migration.
// Once regenerated, replace calls with admin.from("users").update(...).

export type ProfileColumnsUpdate = Partial<{
  avatar_url: string | null;
  email_notifications: boolean;
  reduced_motion: boolean;
}>;

export async function updateProfileColumns(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  patch: ProfileColumnsUpdate
): Promise<{ error: { message: string } | null }> {
  return (
    admin as unknown as {
      from: (table: string) => {
        update: (p: ProfileColumnsUpdate) => {
          eq: (
            col: string,
            val: string
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
    }
  )
    .from("users")
    .update(patch)
    .eq("id", userId);
}
