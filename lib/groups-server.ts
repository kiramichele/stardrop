import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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
