import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseSubmissionMedia,
  type SubmissionMedia,
} from "@/lib/assignments";
import {
  buildSubmissionCommentTree,
  type DevlogAuthor,
  type DevlogFeedItem,
  type SubmissionCommentRow,
  type SubmissionCommentView,
} from "@/lib/devlog-wall";

// `submissions.is_public`, `submission_likes`, and `submission_comments`
// aren't in types/database.ts until a regen runs (and a regen only keeps
// them once the migration is applied). These helpers reach them through
// the same typed-cast shim pattern as the other recent migrations.

type Admin = ReturnType<typeof createAdminClient>;
type DbError = { message: string } | null;

interface SelectChain<T> extends PromiseLike<{ data: T[] | null; error: DbError }> {
  eq(col: string, val: string | boolean): SelectChain<T>;
  in(col: string, vals: readonly string[]): SelectChain<T>;
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): SelectChain<T>;
  limit(n: number): SelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: DbError }>;
}

interface MutateChain extends PromiseLike<{ error: DbError }> {
  eq(col: string, val: string | boolean): MutateChain;
}

interface ShimTable<T> {
  select(cols: string): SelectChain<T>;
  insert(row: Record<string, unknown>): PromiseLike<{ error: DbError }>;
  update(patch: Record<string, unknown>): MutateChain;
  delete(): MutateChain;
}

function shim<T>(admin: Admin, name: string): ShimTable<T> {
  return (admin as unknown as { from: (t: string) => ShimTable<T> }).from(name);
}

type LikeRow = {
  id: string;
  submission_id: string;
  user_id: string;
};

/** Submission row sliced for the wall query (includes is_public + nested joins). */
type WallSubmissionRow = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  uploaded_files: unknown;
  is_public: boolean;
  assignments: {
    id: string;
    type: string;
    title: string;
  } | { id: string; type: string; title: string }[] | null;
  users: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | { id: string; first_name: string; last_name: string; avatar_url: string | null }[] | null;
};

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// =============================================================
// Reads
// =============================================================

/**
 * Every published+public devlog submission, newest first — the wall.
 * Returns the cards as `DevlogFeedItem[]` (one item per submission).
 */
export async function getPublicDevlogs(
  viewerId: string
): Promise<DevlogFeedItem[]> {
  const admin = createAdminClient();

  const { data: rows } = await shim<WallSubmissionRow>(admin, "submissions")
    .select(
      "id, user_id, status, submitted_at, uploaded_files, is_public, assignments(id, type, title), users(id, first_name, last_name, avatar_url)"
    )
    .eq("is_public", true)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  const items: DevlogFeedItem[] = [];
  for (const row of rows ?? []) {
    if (row.status !== "submitted" && row.status !== "graded") continue;
    const assignment = one(row.assignments);
    if (!assignment || assignment.type !== "devlog") continue;
    const author = one(row.users);
    if (!author) continue;

    const video: SubmissionMedia | undefined = parseSubmissionMedia(
      row.uploaded_files
    ).find((m) => m.kind === "video");
    if (!video) continue;

    items.push({
      submissionId: row.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      author: {
        id: author.id,
        firstName: author.first_name,
        lastName: author.last_name,
        avatarUrl: author.avatar_url,
      },
      video,
      submittedAt: row.submitted_at,
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
    });
  }

  if (items.length === 0) return [];

  // Counts + likedByMe in one round-trip each.
  const ids = items.map((i) => i.submissionId);
  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    shim<LikeRow>(admin, "submission_likes")
      .select("submission_id, user_id")
      .in("submission_id", ids),
    shim<SubmissionCommentRow>(admin, "submission_comments")
      .select("submission_id, deleted_at")
      .in("submission_id", ids),
  ]);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likeRows ?? []) {
    likeCount.set(l.submission_id, (likeCount.get(l.submission_id) ?? 0) + 1);
    if (l.user_id === viewerId) likedByMe.add(l.submission_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of commentRows ?? []) {
    if (c.deleted_at !== null) continue;
    commentCount.set(
      c.submission_id,
      (commentCount.get(c.submission_id) ?? 0) + 1
    );
  }

  for (const item of items) {
    item.likeCount = likeCount.get(item.submissionId) ?? 0;
    item.commentCount = commentCount.get(item.submissionId) ?? 0;
    item.likedByMe = likedByMe.has(item.submissionId);
  }

  return items;
}

/** Bulk fetch: submissionId -> comment tree. One round-trip for the wall. */
export async function getCommentsForSubmissions(
  submissionIds: string[]
): Promise<Map<string, SubmissionCommentView[]>> {
  const out = new Map<string, SubmissionCommentView[]>();
  if (submissionIds.length === 0) return out;

  const admin = createAdminClient();
  const { data: rows } = await shim<SubmissionCommentRow>(
    admin,
    "submission_comments"
  )
    .select("*")
    .in("submission_id", submissionIds);
  const all = rows ?? [];

  const userIds = [...new Set(all.map((r) => r.user_id))];
  const authors = new Map<string, DevlogAuthor>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, first_name, last_name, avatar_url")
      .in("id", userIds);
    for (const u of users ?? []) {
      authors.set(u.id, {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatarUrl: u.avatar_url,
      });
    }
  }

  const bySubmission = new Map<string, SubmissionCommentRow[]>();
  for (const r of all) {
    const list = bySubmission.get(r.submission_id) ?? [];
    list.push(r);
    bySubmission.set(r.submission_id, list);
  }
  for (const [sid, rs] of bySubmission) {
    out.set(sid, buildSubmissionCommentTree(rs, authors));
  }
  return out;
}

/** Comments on one submission, with authors, as a two-level tree. */
export async function getSubmissionComments(
  submissionId: string
): Promise<SubmissionCommentView[]> {
  const admin = createAdminClient();
  const { data: rows } = await shim<SubmissionCommentRow>(
    admin,
    "submission_comments"
  )
    .select("*")
    .eq("submission_id", submissionId);

  const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
  const map = new Map<string, DevlogAuthor>();
  if (ids.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, first_name, last_name, avatar_url")
      .in("id", ids);
    for (const u of users ?? []) {
      map.set(u.id, {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        avatarUrl: u.avatar_url,
      });
    }
  }
  return buildSubmissionCommentTree(rows ?? [], map);
}

// =============================================================
// Writes
// =============================================================

/** Owner or teacher only. */
export async function setSubmissionPublicRecord(
  submissionId: string,
  userId: string,
  isTeacher: boolean,
  isPublic: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select("user_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Submission not found" };
  if (!isTeacher && sub.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await shim(admin, "submissions")
    .update({ is_public: isPublic })
    .eq("id", submissionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Toggle the viewer's like on a submission. */
export async function toggleSubmissionLikeRecord(
  submissionId: string,
  userId: string
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await shim<LikeRow>(admin, "submission_likes")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await shim(admin, "submission_likes")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, liked: false };
  }

  const { error } = await shim<LikeRow>(admin, "submission_likes").insert({
    id: crypto.randomUUID(),
    submission_id: submissionId,
    user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, liked: true };
}

/** Add a top-level comment or a reply. Reply-to-reply collapses to the top-level. */
export async function insertSubmissionCommentRecord(
  submissionId: string,
  userId: string,
  body: string,
  parentId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  let resolvedParent: string | null = null;
  if (parentId) {
    const { data: parent } = await shim<SubmissionCommentRow>(
      admin,
      "submission_comments"
    )
      .select("submission_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.submission_id !== submissionId) {
      return { ok: false, error: "Comment not found" };
    }
    resolvedParent = parent.parent_id ?? parentId;
  }

  const { error } = await shim<SubmissionCommentRow>(
    admin,
    "submission_comments"
  ).insert({
    id: crypto.randomUUID(),
    submission_id: submissionId,
    user_id: userId,
    body,
    parent_id: resolvedParent,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Soft-delete. Author or teacher only. */
export async function deleteSubmissionCommentRecord(
  commentId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; submissionId?: string; error?: string }> {
  const admin = createAdminClient();
  const { data: comment } = await shim<SubmissionCommentRow>(
    admin,
    "submission_comments"
  )
    .select("user_id, submission_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return { ok: false, error: "Comment not found" };

  const byTeacher = isTeacher && comment.user_id !== userId;
  if (!isTeacher && comment.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }

  const { error } = await shim<SubmissionCommentRow>(
    admin,
    "submission_comments"
  )
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: byTeacher ? "removed by teacher" : "removed by author",
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, submissionId: comment.submission_id };
}

/** Read is_public for a single submission — used by the grading page. */
export async function getSubmissionIsPublic(
  submissionId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await shim<{ is_public: boolean }>(admin, "submissions")
    .select("is_public")
    .eq("id", submissionId)
    .maybeSingle();
  return Boolean(data?.is_public);
}
