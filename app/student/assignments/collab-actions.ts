"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeGroupSubmission } from "@/lib/groups-server";

type Result = { ok: true } | { ok: false; error: string };

async function membership(
  admin: ReturnType<typeof createAdminClient>,
  groupId: string,
  userId: string
): Promise<{ assignmentId: string; createdBy: string | null } | null> {
  const { data: m } = await admin
    .from("group_members")
    .select("assignment_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!m) return null;
  const { data: g } = await admin
    .from("assignment_groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  return { assignmentId: m.assignment_id, createdBy: g?.created_by ?? null };
}

/** Debounced autosave of the shared Yjs document (base64 state + plain text). */
export async function saveGroupDocument(
  groupId: string,
  state: string,
  content: string
): Promise<Result> {
  const user = await requireStudent();
  const admin = createAdminClient();
  if (!(await membership(admin, groupId, user.id))) {
    return { ok: false, error: "You're not in this group." };
  }
  const { error } = await admin.from("group_documents").upsert(
    {
      group_id: groupId,
      state,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Submit the whole group's work. Honors the leader-only toggle. */
export async function submitGroup(groupId: string): Promise<Result> {
  const user = await requireStudent();
  const admin = createAdminClient();
  const m = await membership(admin, groupId, user.id);
  if (!m) return { ok: false, error: "You're not in this group." };

  const { data: a } = await admin
    .from("assignments")
    .select("leader_submits_only")
    .eq("id", m.assignmentId)
    .maybeSingle();
  if (a?.leader_submits_only && m.createdBy !== user.id) {
    return { ok: false, error: "Only the group leader can submit." };
  }

  const r = await writeGroupSubmission(groupId);
  if (!r.ok) return { ok: false, error: "Submit failed." };

  revalidatePath(`/student/assignments/${m.assignmentId}`);
  revalidatePath("/student/assignments");
  return { ok: true };
}
