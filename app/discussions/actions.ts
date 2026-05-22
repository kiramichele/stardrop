"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import {
  getUserClassIds,
  insertDiscussionPost,
} from "@/lib/discussions-server";
import {
  scanProfanity,
  parseMentions,
  type DiscussionAttachment,
} from "@/lib/discussions";
import {
  createNotifications,
  type NewNotification,
} from "@/lib/notifications-server";
import { asProfile, type UserProfile } from "@/lib/profile";

// =============================================================
// Boards
// =============================================================

export async function createBoard(
  formData: FormData
): Promise<{ ok: true; boardId: string } | { ok: false; error: string }> {
  const user = asProfile(await requireUser());
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const classId = formData.get("class_id")?.toString();
  if (!title) return { ok: false, error: "Title required" };
  if (!classId) return { ok: false, error: "Pick a class" };

  const classIds = await getUserClassIds(user);
  if (!classIds.includes(classId)) {
    return { ok: false, error: "You can't create a board in that class." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("discussion_boards")
    .insert({ class_id: classId, created_by: user.id, title, description })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create board" };
  }

  revalidatePath("/discussions");
  return { ok: true, boardId: data.id };
}

export async function deleteBoard(boardId: string): Promise<void> {
  const user = await requireUser();
  if (user.role !== "teacher") throw new Error("Not authorized");
  const admin = createAdminClient();
  // Hard delete: the board is gone, so its posts go with it.
  await admin.from("discussion_posts").delete().eq("board_id", boardId);
  const { error } = await admin
    .from("discussion_boards")
    .delete()
    .eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/discussions");
  redirect("/discussions");
}

export async function setBoardPinned(boardId: string, pinned: boolean) {
  const user = await requireUser();
  if (user.role !== "teacher") return { ok: false, error: "Not authorized" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("discussion_boards")
    .update({ is_pinned: pinned })
    .eq("id", boardId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/discussions");
  return { ok: true };
}

export async function setBoardLocked(boardId: string, locked: boolean) {
  const user = await requireUser();
  if (user.role !== "teacher") return { ok: false, error: "Not authorized" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("discussion_boards")
    .update({ is_locked: locked })
    .eq("id", boardId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/discussions");
  revalidatePath(`/discussions/${boardId}`);
  return { ok: true };
}

// =============================================================
// Posts (threads + replies)
// =============================================================

async function uploadAttachments(
  admin: ReturnType<typeof createAdminClient>,
  boardId: string,
  files: File[]
): Promise<DiscussionAttachment[]> {
  const out: DiscussionAttachment[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) continue;

    const id = crypto.randomUUID();
    const ext = isVideo ? "webm" : "png";
    const path = `${boardId}/${id}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { error } = await admin.storage
      .from("discussion")
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });
    if (error) continue; // skip a failed file rather than failing the post
    out.push({
      id,
      kind: isVideo ? "video" : "image",
      storagePath: path,
      mime: file.type,
      size: file.size,
    });
  }
  return out;
}

async function fanOutNotifications(args: {
  admin: ReturnType<typeof createAdminClient>;
  user: UserProfile;
  board: { id: string; title: string };
  parentId: string | null;
  postId: string;
  body: string;
}) {
  const { admin, user, board, parentId, postId, body } = args;
  const threadId = parentId ?? postId;
  const href = `/discussions/${board.id}/${threadId}`;
  const actorName = `${user.first_name} ${user.last_name}`.trim();

  // One notification per user max; more specific types win.
  const byUser = new Map<string, NewNotification>();

  // Every post alerts the teacher(s) for moderation.
  const { data: teachers } = await admin
    .from("users")
    .select("id")
    .eq("role", "teacher");
  for (const t of teachers ?? []) {
    byUser.set(t.id, {
      userId: t.id,
      type: "discussion_post",
      payload: {
        message: `${actorName} posted in "${board.title}"`,
        href,
        actorName,
      },
    });
  }

  // A reply notifies the thread's author.
  if (parentId) {
    const { data: thread } = await admin
      .from("discussion_posts")
      .select("user_id")
      .eq("id", parentId)
      .maybeSingle();
    if (thread?.user_id) {
      byUser.set(thread.user_id, {
        userId: thread.user_id,
        type: "discussion_reply",
        payload: {
          message: `${actorName} replied to your post`,
          href,
          actorName,
        },
      });
    }
  }

  // @mentions notify the named users.
  const mentions = parseMentions(body);
  if (mentions.length > 0) {
    const { data: mentioned } = await admin
      .from("users")
      .select("id")
      .in("username", mentions);
    for (const m of mentioned ?? []) {
      byUser.set(m.id, {
        userId: m.id,
        type: "discussion_mention",
        payload: {
          message: `${actorName} mentioned you in "${board.title}"`,
          href,
          actorName,
        },
      });
    }
  }

  byUser.delete(user.id); // never notify yourself
  await createNotifications([...byUser.values()]);
}

export async function createPost(
  formData: FormData
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const user = asProfile(await requireUser());

  const boardId = formData.get("board_id")?.toString();
  const parentIdRaw = formData.get("parent_id")?.toString();
  const parentId = parentIdRaw && parentIdRaw !== "" ? parentIdRaw : null;
  const body = formData.get("body")?.toString().trim() ?? "";
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!boardId) return { ok: false, error: "Missing board" };
  if (!body && files.length === 0) {
    return { ok: false, error: "Write something or attach a file." };
  }

  const admin = createAdminClient();
  const { data: board } = await admin
    .from("discussion_boards")
    .select("id, class_id, is_locked, title")
    .eq("id", boardId)
    .maybeSingle();
  if (!board) return { ok: false, error: "Board not found" };

  const classIds = await getUserClassIds(user);
  if (!classIds.includes(board.class_id)) {
    return { ok: false, error: "You don't have access to this board." };
  }
  if (board.is_locked && user.role !== "teacher") {
    return { ok: false, error: "This board is locked." };
  }

  const flaggedTerms = scanProfanity(body);
  const attachments = await uploadAttachments(admin, boardId, files);

  const { data: post, error } = await insertDiscussionPost(admin, {
    board_id: boardId,
    user_id: user.id,
    body,
    parent_id: parentId,
    attachments,
    flagged_at: flaggedTerms.length > 0 ? new Date().toISOString() : null,
    flagged_terms: flaggedTerms.length > 0 ? flaggedTerms : null,
  });
  if (error || !post) {
    return { ok: false, error: error?.message ?? "Failed to post" };
  }

  await fanOutNotifications({
    admin,
    user,
    board: { id: board.id, title: board.title },
    parentId,
    postId: post.id,
    body,
  });

  const threadId = parentId ?? post.id;
  revalidatePath(`/discussions/${boardId}`);
  revalidatePath(`/discussions/${boardId}/${threadId}`);
  return { ok: true, threadId };
}

export async function deletePost(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("discussion_posts")
    .select("id, user_id, board_id, parent_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { ok: false, error: "Post not found" };

  const isTeacher = user.role === "teacher";
  if (!isTeacher && post.user_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }

  const { error } = await admin
    .from("discussion_posts")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason:
        isTeacher && post.user_id !== user.id
          ? "removed by teacher"
          : "removed by author",
    })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };

  const threadId = post.parent_id ?? post.id;
  revalidatePath(`/discussions/${post.board_id}`);
  revalidatePath(`/discussions/${post.board_id}/${threadId}`);
  return { ok: true };
}

export async function setPostPinned(postId: string, pinned: boolean) {
  const user = await requireUser();
  if (user.role !== "teacher") return { ok: false, error: "Not authorized" };
  const admin = createAdminClient();

  const { data: post } = await admin
    .from("discussion_posts")
    .select("board_id, parent_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { ok: false, error: "Post not found" };

  const { error } = await admin
    .from("discussion_posts")
    .update({ is_pinned: pinned })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };

  const threadId = post.parent_id ?? postId;
  revalidatePath(`/discussions/${post.board_id}/${threadId}`);
  return { ok: true };
}
