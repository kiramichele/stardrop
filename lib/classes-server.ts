import { createAdminClient } from "@/lib/supabase/admin";

// Small shared helper — several teacher tools (parent digest, announcements)
// need the same "pick a class, or leave it for everyone" list.

export type ClassOption = { id: string; label: string };

/** Every class, "Name · Period N" (or just the name), ordered by period. */
export async function getClassOptions(): Promise<ClassOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    label:
      c.period_number != null ? `${c.name} · Period ${c.period_number}` : c.name,
  }));
}
