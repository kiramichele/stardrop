"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

type Ctx = {
  admin: ReturnType<typeof createAdminClient>;
  assignment: {
    id: string;
    class_id: string;
    group_mode: string | null;
    max_group_size: number | null;
    allow_solo: boolean;
  };
  userId: string;
};

/**
 * Validate that the current student may self-organize on this assignment:
 * it's collaborative, in "choice" mode, and they're enrolled in its class.
 */
async function loadChoiceContext(
  assignmentId: string
): Promise<Ctx | { error: string }> {
  const user = await requireStudent();
  const admin = createAdminClient();

  const { data: a } = await admin
    .from("assignments")
    .select("id, class_id, collaborative, group_mode, max_group_size, allow_solo")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return { error: "Assignment not found." };
  if (!a.collaborative) return { error: "This assignment isn't collaborative." };
  if (a.group_mode !== "choice") {
    return { error: "Your teacher assigns the groups for this one." };
  }

  const { data: enr } = await admin
    .from("enrollments")
    .select("user_id")
    .eq("class_id", a.class_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!enr) return { error: "You're not in this class." };

  return { admin, assignment: a, userId: user.id };
}

async function currentGroupId(
  admin: Ctx["admin"],
  assignmentId: string,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from("group_members")
    .select("group_id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.group_id ?? null;
}

export async function createOpenGroup(
  assignmentId: string,
  name?: string
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { admin, userId } = ctx;

  if (await currentGroupId(admin, assignmentId, userId)) {
    return { ok: false, error: "You're already in a group." };
  }

  const { data: group, error } = await admin
    .from("assignment_groups")
    .insert({
      assignment_id: assignmentId,
      name: name?.trim() || null,
      status: "open",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !group) {
    return { ok: false, error: error?.message ?? "Couldn't create the group." };
  }

  const { error: memberError } = await admin
    .from("group_members")
    .insert({ group_id: group.id, assignment_id: assignmentId, user_id: userId });
  if (memberError) {
    await admin.from("assignment_groups").delete().eq("id", group.id);
    return { ok: false, error: memberError.message };
  }

  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true, groupId: group.id };
}

export async function joinGroup(
  assignmentId: string,
  groupId: string
): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { admin, assignment, userId } = ctx;

  if (await currentGroupId(admin, assignmentId, userId)) {
    return { ok: false, error: "You're already in a group." };
  }

  const { data: group } = await admin
    .from("assignment_groups")
    .select("id, status, assignment_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || group.assignment_id !== assignmentId) {
    return { ok: false, error: "That group doesn't exist." };
  }
  if (group.status !== "open") {
    return { ok: false, error: "That group is closed." };
  }

  if (assignment.max_group_size != null) {
    const { count } = await admin
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);
    if ((count ?? 0) >= assignment.max_group_size) {
      return { ok: false, error: "That group is full." };
    }
  }

  const { error } = await admin
    .from("group_members")
    .insert({ group_id: groupId, assignment_id: assignmentId, user_id: userId });
  if (error) {
    // Unique violation → someone/somewhere already grouped them.
    return { ok: false, error: "You're already in a group." };
  }

  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}

export async function leaveGroup(
  assignmentId: string,
  groupId: string
): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { admin, userId } = ctx;

  const { error } = await admin
    .from("group_members")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .eq("group_id", groupId);
  if (error) return { ok: false, error: error.message };

  // Clean up a group that's now empty (e.g. a solo group or the last member).
  const { count } = await admin
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if ((count ?? 0) === 0) {
    await admin.from("assignment_groups").delete().eq("id", groupId);
  }

  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}

/** Rename / close require the caller to be a member (any member may). */
async function requireMembership(
  ctx: Ctx,
  groupId: string
): Promise<boolean> {
  const { data } = await ctx.admin
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  return !!data;
}

export async function renameGroup(
  assignmentId: string,
  groupId: string,
  name: string
): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!(await requireMembership(ctx, groupId))) {
    return { ok: false, error: "Only members can rename this group." };
  }
  const { error } = await ctx.admin
    .from("assignment_groups")
    .update({ name: name.trim() || null })
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}

export async function closeGroup(
  assignmentId: string,
  groupId: string
): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!(await requireMembership(ctx, groupId))) {
    return { ok: false, error: "Only members can close this group." };
  }
  const { error } = await ctx.admin
    .from("assignment_groups")
    .update({ status: "closed" })
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}

export async function reopenGroup(
  assignmentId: string,
  groupId: string
): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!(await requireMembership(ctx, groupId))) {
    return { ok: false, error: "Only members can reopen this group." };
  }
  const { error } = await ctx.admin
    .from("assignment_groups")
    .update({ status: "open" })
    .eq("id", groupId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}

export async function workSolo(assignmentId: string): Promise<Result> {
  const ctx = await loadChoiceContext(assignmentId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { admin, assignment, userId } = ctx;

  if (!assignment.allow_solo) {
    return { ok: false, error: "Solo work isn't allowed on this assignment." };
  }
  if (await currentGroupId(admin, assignmentId, userId)) {
    return { ok: false, error: "You're already in a group." };
  }

  const { data: group, error } = await admin
    .from("assignment_groups")
    .insert({
      assignment_id: assignmentId,
      is_solo: true,
      status: "closed",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !group) {
    return { ok: false, error: error?.message ?? "Couldn't set up solo work." };
  }
  const { error: memberError } = await admin
    .from("group_members")
    .insert({ group_id: group.id, assignment_id: assignmentId, user_id: userId });
  if (memberError) {
    await admin.from("assignment_groups").delete().eq("id", group.id);
    return { ok: false, error: memberError.message };
  }

  revalidatePath(`/student/assignments/${assignmentId}`);
  return { ok: true };
}
