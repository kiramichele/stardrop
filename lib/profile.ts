// Client-safe: profile types + coercion.
//
// avatar_url / email_notifications / reduced_motion aren't in
// types/database.ts until it's regenerated after the user_profile_fields
// migration. asProfile() bridges that gap by reading them defensively off
// a raw users row — it stays correct once the columns are properly typed.

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  real_email: string | null;
  role: "teacher" | "student";
  avatar_url: string | null;
  email_notifications: boolean;
  reduced_motion: boolean;
};

export function asProfile(row: unknown): UserProfile {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : "",
    first_name: typeof r.first_name === "string" ? r.first_name : "",
    last_name: typeof r.last_name === "string" ? r.last_name : "",
    username: typeof r.username === "string" ? r.username : "",
    real_email: typeof r.real_email === "string" ? r.real_email : null,
    role: r.role === "teacher" ? "teacher" : "student",
    avatar_url: typeof r.avatar_url === "string" ? r.avatar_url : null,
    // default-on for notifications, default-off for reduced motion
    email_notifications: r.email_notifications !== false,
    reduced_motion: r.reduced_motion === true,
  };
}
