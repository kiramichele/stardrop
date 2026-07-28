"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnrolledStudents, getAssignmentGroups } from "@/lib/groups-server";
import { partitionIntoGroups } from "@/lib/groups";

type Result = { ok: true } | { ok: false; error: string };

function revalidateAssignment(assignmentId: string) {
  revalidatePath(`/teacher/assignments/${assignmentId}`);
}

/** Fisher–Yates shuffle (server-side; Math.random is fine here). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Wipe this assignment's groups and randomly partition the class into groups
 * of at most max_group_size. Used by the Random mode "Generate" button.
 */
export async function generateRandomGroups(
  assignmentId: string
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("class_id, max_group_size")
    .eq("id", assignmentId)
    .single();
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const students = await getEnrolledStudents(assignment.class_id);
  if (students.length === 0) {
    return { ok: false, error: "No students enrolled in this class yet." };
  }

  const maxSize = assignment.max_group_size ?? students.length;
  const partitions = partitionIntoGroups(
    shuffle(students.map((s) => s.id)),
    maxSize
  );

  // Replace any existing groups (members cascade away).
  await admin.from("assignment_groups").delete().eq("assignment_id", assignmentId);

  for (const memberIds of partitions) {
    const { data: group, error } = await admin
      .from("assignment_groups")
      .insert({ assignment_id: assignmentId, status: "closed" })
      .select("id")
      .single();
    if (error || !group) {
      return { ok: false, error: error?.message ?? "Failed to make groups." };
    }
    await admin.from("group_members").insert(
      memberIds.map((userId) => ({
        group_id: group.id,
        assignment_id: assignmentId,
        user_id: userId,
      }))
    );
  }

  revalidateAssignment(assignmentId);
  return { ok: true };
}

/**
 * Sweep every ungrouped student into a group so no one is left out. Fills
 * existing open (non-solo) groups up to max_group_size first — preserving the
 * groups students already formed — then partitions any leftovers into new
 * groups. Used in "Students choose" mode once sign-up is winding down.
 */
export async function groupRemainingStudents(
  assignmentId: string
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("class_id, max_group_size")
    .eq("id", assignmentId)
    .single();
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const [students, groups] = await Promise.all([
    getEnrolledStudents(assignment.class_id),
    getAssignmentGroups(assignmentId),
  ]);

  const grouped = new Set(groups.flatMap((g) => g.members.map((m) => m.userId)));
  const remaining = shuffle(
    students.filter((s) => !grouped.has(s.id)).map((s) => s.id)
  );
  if (remaining.length === 0) return { ok: true };

  const max = assignment.max_group_size;

  // 1) Top up existing open groups that still have room.
  if (max != null) {
    for (const g of groups) {
      if (g.status !== "open" || g.isSolo) continue;
      let space = max - g.members.length;
      while (space > 0 && remaining.length > 0) {
        const userId = remaining.shift() as string;
        await admin
          .from("group_members")
          .insert({ group_id: g.id, assignment_id: assignmentId, user_id: userId });
        space -= 1;
      }
    }
  }

  // 2) Leftovers → brand-new groups of at most max (or one group if no max).
  const chunks =
    max != null
      ? partitionIntoGroups(remaining, max)
      : remaining.length > 0
        ? [remaining]
        : [];
  for (const ids of chunks) {
    const { data: group } = await admin
      .from("assignment_groups")
      .insert({ assignment_id: assignmentId, status: "open" })
      .select("id")
      .single();
    if (!group) continue;
    await admin.from("group_members").insert(
      ids.map((userId) => ({
        group_id: group.id,
        assignment_id: assignmentId,
        user_id: userId,
      }))
    );
  }

  revalidateAssignment(assignmentId);
  return { ok: true };
}

/** Create an empty group (teacher, e.g. for manual assignment). */
export async function createGroup(
  assignmentId: string,
  name?: string
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  await requireTeacher();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("assignment_groups")
    .insert({
      assignment_id: assignmentId,
      name: name?.trim() || null,
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create group." };
  }
  revalidateAssignment(assignmentId);
  return { ok: true, groupId: data.id };
}

export async function renameGroup(
  assignmentId: string,
  groupId: string,
  name: string
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();
  const { error } = await admin
    .from("assignment_groups")
    .update({ name: name.trim() || null })
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidateAssignment(assignmentId);
  return { ok: true };
}

export async function deleteGroup(
  assignmentId: string,
  groupId: string
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();
  const { error } = await admin
    .from("assignment_groups")
    .delete()
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidateAssignment(assignmentId);
  return { ok: true };
}

export async function setGroupStatus(
  assignmentId: string,
  groupId: string,
  status: "open" | "closed"
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();
  const { error } = await admin
    .from("assignment_groups")
    .update({ status })
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidateAssignment(assignmentId);
  return { ok: true };
}

/**
 * Grade a whole group at once: writes the same score (and optional feedback)
 * to every member's submission, creating a submission row for any member who
 * doesn't have one yet. Marks each graded.
 */
export async function setGroupGrade(
  assignmentId: string,
  groupId: string,
  score: number,
  feedback?: string
): Promise<Result> {
  await requireTeacher();
  if (!Number.isFinite(score) || score < 0) {
    return { ok: false, error: "Score must be 0 or higher." };
  }
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  if (!members || members.length === 0) {
    return { ok: false, error: "This group has no members." };
  }

  const now = new Date().toISOString();
  for (const m of members) {
    const { data: existing } = await admin
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("user_id", m.user_id)
      .maybeSingle();

    let submissionId: string;
    if (existing) {
      submissionId = existing.id;
    } else {
      const { data: created } = await admin
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          user_id: m.user_id,
          status: "submitted",
          submitted_at: now,
        })
        .select("id")
        .single();
      if (!created) continue;
      submissionId = created.id;
    }

    await admin
      .from("grades")
      .upsert(
        {
          submission_id: submissionId,
          score,
          feedback: feedback?.trim() || null,
          graded_at: now,
        },
        { onConflict: "submission_id" }
      );
    await admin
      .from("submissions")
      .update({ status: "graded" })
      .eq("id", submissionId);
  }

  revalidateAssignment(assignmentId);
  return { ok: true };
}

/**
 * Move a student into a group (or out to the Unassigned pool when
 * toGroupId is null). Teacher override — not bounded by max_group_size.
 */
export async function moveMember(
  assignmentId: string,
  userId: string,
  toGroupId: string | null
): Promise<Result> {
  await requireTeacher();
  const admin = createAdminClient();

  if (toGroupId === null) {
    const { error } = await admin
      .from("group_members")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
  } else {
    // Upsert on the (assignment_id, user_id) unique key so a student moves
    // rather than duplicating.
    const { error } = await admin.from("group_members").upsert(
      { group_id: toGroupId, assignment_id: assignmentId, user_id: userId },
      { onConflict: "assignment_id,user_id" }
    );
    if (error) return { ok: false, error: error.message };
  }
  revalidateAssignment(assignmentId);
  return { ok: true };
}
