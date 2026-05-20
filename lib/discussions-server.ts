import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile, type UserProfile } from "@/lib/profile";
import {
  parseAttachments,
  type BoardPost,
  type DiscussionBoard,
} from "@/lib/discussions";

// =============================================================
// discussion_posts has new columns (flagged_at, flagged_terms,
// attachments) not yet in types/database.ts. Reads use select("*")
// + coercePost(); inserts go through this shim. is_pinned /
// deleted_at / deleted_reason are existing columns — those update
// through the normal typed client.
// =============================================================
type DiscussionPostInsert = {
  board_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  is_pinned?: boolean;
  attachments?: unknown;
  flagged_at?: string | null;
  flagged_terms?: string[] | null;
};

export async function insertDiscussionPost(
  admin: ReturnType<typeof createAdminClient>,
  row: DiscussionPostInsert
): Promise<{
  data: { id: string } | null;
  error: { message: string } | null;
}> {
  return (
    admin as unknown as {
      from: (t: string) => {
        insert: (r: DiscussionPostInsert) => {
          select: (c: string) => {
            single: () => Promise<{
              data: { id: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("discussion_posts")
    .insert(row)
    .select("id")
    .single();
}

function coercePost(raw: unknown, replyCount: number): BoardPost {
  const r = (raw ?? {}) as Record<string, unknown>;
  const userRaw = r.users;
  const u = Array.isArray(userRaw) ? userRaw[0] : userRaw;
  const author = u ? asProfile(u) : null;
  const deleted = r.deleted_at != null;
  return {
    id: String(r.id ?? ""),
    boardId: String(r.board_id ?? ""),
    parentId: typeof r.parent_id === "string" ? r.parent_id : null,
    body: deleted ? "" : typeof r.body === "string" ? r.body : "",
    isPinned: r.is_pinned === true,
    flagged: r.flagged_at != null,
    flaggedTerms: Array.isArray(r.flagged_terms)
      ? (r.flagged_terms as string[])
      : [],
    attachments: deleted ? [] : parseAttachments(r.attachments),
    createdAt: typeof r.created_at === "string" ? r.created_at : null,
    deleted,
    author: author
      ? {
          id: author.id,
          firstName: author.first_name,
          lastName: author.last_name,
          avatarUrl: author.avatar_url,
          role: author.role,
        }
      : null,
    replyCount,
  };
}

/** Class ids the user can see boards for: all for teachers, enrolled for students. */
export async function getUserClassIds(user: UserProfile): Promise<string[]> {
  const supabase = await createClient();
  if (user.role === "teacher") {
    const { data } = await supabase.from("classes").select("id");
    return (data ?? []).map((c) => c.id);
  }
  const { data } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("user_id", user.id);
  return (data ?? []).map((e) => e.class_id);
}

export async function getBoardsForUser(
  user: UserProfile
): Promise<DiscussionBoard[]> {
  const classIds = await getUserClassIds(user);
  if (classIds.length === 0) return [];

  const admin = createAdminClient();
  const { data: boards } = await admin
    .from("discussion_boards")
    .select("id, class_id, title, description, is_pinned, is_locked, created_at, classes(name)")
    .in("class_id", classIds)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (!boards || boards.length === 0) return [];

  // Count non-deleted top-level threads per board
  const { data: posts } = await admin
    .from("discussion_posts")
    .select("board_id, parent_id, deleted_at")
    .in(
      "board_id",
      boards.map((b) => b.id)
    );
  const threadCount = new Map<string, number>();
  for (const p of posts ?? []) {
    if (p.parent_id === null && p.deleted_at === null) {
      threadCount.set(p.board_id, (threadCount.get(p.board_id) ?? 0) + 1);
    }
  }

  return boards.map((b) => {
    const klass = Array.isArray(b.classes) ? b.classes[0] : b.classes;
    return {
      id: b.id,
      classId: b.class_id,
      className: klass?.name ?? null,
      title: b.title,
      description: b.description,
      isPinned: b.is_pinned,
      isLocked: b.is_locked,
      createdAt: b.created_at,
      threadCount: threadCount.get(b.id) ?? 0,
    };
  });
}

export async function getBoard(
  boardId: string
): Promise<DiscussionBoard | null> {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("discussion_boards")
    .select("id, class_id, title, description, is_pinned, is_locked, created_at, classes(name)")
    .eq("id", boardId)
    .maybeSingle();
  if (!b) return null;
  const klass = Array.isArray(b.classes) ? b.classes[0] : b.classes;
  return {
    id: b.id,
    classId: b.class_id,
    className: klass?.name ?? null,
    title: b.title,
    description: b.description,
    isPinned: b.is_pinned,
    isLocked: b.is_locked,
    createdAt: b.created_at,
    threadCount: 0,
  };
}

/** Top-level posts ("threads") in a board, pinned first then newest. */
export async function getBoardThreads(boardId: string): Promise<BoardPost[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("discussion_posts")
    .select("*, users(*)")
    .eq("board_id", boardId);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const replyCount = new Map<string, number>();
  for (const r of rows) {
    if (r.parent_id != null && r.deleted_at == null) {
      const pid = String(r.parent_id);
      replyCount.set(pid, (replyCount.get(pid) ?? 0) + 1);
    }
  }

  return rows
    .filter((r) => r.parent_id == null)
    .map((r) => coercePost(r, replyCount.get(String(r.id)) ?? 0))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
}

/** A thread (top-level post) plus its replies, oldest-first. */
export async function getThreadWithReplies(
  threadId: string
): Promise<{ thread: BoardPost; replies: BoardPost[] } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("discussion_posts")
    .select("*, users(*)")
    .or(`id.eq.${threadId},parent_id.eq.${threadId}`);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const threadRow = rows.find((r) => String(r.id) === threadId);
  if (!threadRow) return null;

  const replies = rows
    .filter((r) => r.parent_id != null)
    .map((r) => coercePost(r, 0))
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  return { thread: coercePost(threadRow, replies.length), replies };
}
