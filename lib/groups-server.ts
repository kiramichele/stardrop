import "server-only";
import * as Y from "yjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { starterCodeFor, type CodeRunMode } from "@/lib/playground";
import type { AssignmentGroup, GroupMember, GroupStatus } from "@/lib/groups";

/**
 * Server-side collaborative-group queries. All go through the service-role
 * admin client; the calling server actions/pages are responsible for auth
 * (requireTeacher / requireStudent + enrollment).
 */

export type RosterStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

/** All of an assignment's groups with their members (members sorted by name). */
export async function getAssignmentGroups(
  assignmentId: string
): Promise<AssignmentGroup[]> {
  const admin = createAdminClient();

  const { data: groups } = await admin
    .from("assignment_groups")
    .select("id, name, status, is_solo, created_by, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: true });
  if (!groups || groups.length === 0) return [];

  const { data: members } = await admin
    .from("group_members")
    .select("group_id, user_id, users(first_name, last_name)")
    .eq("assignment_id", assignmentId);

  const byGroup = new Map<string, GroupMember[]>();
  for (const m of members ?? []) {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const list = byGroup.get(m.group_id) ?? [];
    list.push({
      userId: m.user_id,
      firstName: u?.first_name ?? "",
      lastName: u?.last_name ?? "",
    });
    byGroup.set(m.group_id, list);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.status as GroupStatus,
    isSolo: g.is_solo,
    createdBy: g.created_by,
    members: (byGroup.get(g.id) ?? []).sort(
      (a, b) =>
        (a.lastName || "").localeCompare(b.lastName || "") ||
        (a.firstName || "").localeCompare(b.firstName || "")
    ),
  }));
}

/**
 * Fetch (or lazily create) the shared Yjs document for a group. On first use
 * we seed a Y.Doc server-side with the assignment's starter code and store its
 * encoded state, so every client loads a non-empty base and no two clients
 * race to seed. Returns base64 `state` + plain `content`.
 */
export async function getOrInitGroupDocument(
  groupId: string,
  assignmentId: string
): Promise<{ state: string; content: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("group_documents")
    .select("state, content")
    .eq("group_id", groupId)
    .maybeSingle();
  if (existing?.state) {
    return { state: existing.state, content: existing.content ?? "" };
  }

  // Seed from the assignment's starter code.
  const { data: assignment } = await admin
    .from("assignments")
    .select("code_run_mode")
    .eq("id", assignmentId)
    .maybeSingle();
  const runMode = ((assignment as { code_run_mode?: string } | null)
    ?.code_run_mode ?? "unity") as CodeRunMode;
  const starter = starterCodeFor("csharp", runMode);

  const doc = new Y.Doc();
  doc.getText("code").insert(0, starter);
  const state = Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");

  await admin
    .from("group_documents")
    .upsert(
      { group_id: groupId, state, content: starter },
      { onConflict: "group_id" }
    );

  return { state, content: starter };
}

/** The group id a student is in for this assignment, or null. */
export async function getStudentGroupId(
  assignmentId: string,
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("group_members")
    .select("group_id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.group_id ?? null;
}

/**
 * Record the group's shared code as a submission for EVERY member (so the
 * existing per-student gradebook/analytics keep working). Skips members whose
 * submission is already graded. Used by manual submit, on-access auto-submit,
 * and the daily cron sweep.
 */
export async function writeGroupSubmission(
  groupId: string
): Promise<{ ok: boolean; count: number }> {
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("group_documents")
    .select("content")
    .eq("group_id", groupId)
    .maybeSingle();
  const content = doc?.content ?? "";

  const { data: members } = await admin
    .from("group_members")
    .select("assignment_id, user_id")
    .eq("group_id", groupId);
  if (!members || members.length === 0) return { ok: true, count: 0 };

  const now = new Date().toISOString();
  let count = 0;
  for (const m of members) {
    const { data: existing } = await admin
      .from("submissions")
      .select("id, status, submitted_at")
      .eq("assignment_id", m.assignment_id)
      .eq("user_id", m.user_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "graded") continue; // don't clobber a grade
      await admin
        .from("submissions")
        .update({
          content,
          status: "submitted",
          submitted_at: existing.submitted_at ?? now,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("submissions").insert({
        assignment_id: m.assignment_id,
        user_id: m.user_id,
        content,
        status: "submitted",
        submitted_at: now,
      });
    }
    count += 1;
  }
  return { ok: true, count };
}

/** Has the group already submitted (any member's submission not a draft)? */
export async function groupHasSubmitted(groupId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("assignment_id, user_id")
    .eq("group_id", groupId)
    .limit(1)
    .maybeSingle();
  if (!member) return false;
  const { data: sub } = await admin
    .from("submissions")
    .select("status")
    .eq("assignment_id", member.assignment_id)
    .eq("user_id", member.user_id)
    .maybeSingle();
  return sub?.status === "submitted" || sub?.status === "graded";
}

/**
 * Auto-submit a group's work if the assignment's due date has passed and the
 * group hasn't submitted yet. Safe to call on every page render.
 */
export async function maybeAutoSubmitGroup(
  assignmentId: string,
  groupId: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("assignments")
    .select("due_date")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a?.due_date) return;
  if (new Date(a.due_date).getTime() > Date.now()) return;
  if (await groupHasSubmitted(groupId)) return;
  await writeGroupSubmission(groupId);
}

/** Students enrolled in a class, sorted by name. */
export async function getEnrolledStudents(
  classId: string
): Promise<RosterStudent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("enrollments")
    .select("users(id, first_name, last_name, role)")
    .eq("class_id", classId);

  return (data ?? [])
    .map((e) => (Array.isArray(e.users) ? e.users[0] : e.users))
    .filter(
      (u): u is { id: string; first_name: string; last_name: string; role: string } =>
        !!u && u.role === "student"
    )
    .map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
    }))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
    );
}
