import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCommentTree,
  type ProjectAuthor,
  type ShowcaseProject,
  type ShowcaseProjectView,
  type ShowcaseCommentRow,
  type ShowcaseCommentView,
} from "@/lib/showcase";

// =============================================================
// Regen-proof shim
// -------------------------------------------------------------
// showcase_projects / showcase_likes / showcase_comments aren't in
// types/database.ts (and a types regen would drop any hand-add), so this
// file reaches them through a small typed shim. Once the tables are in the
// generated types, the shim can be replaced with admin.from("showcase_*").
// =============================================================

type DbError = { message: string } | null;
type Rows<T> = { data: T[] | null; error: DbError };
type Single<T> = { data: T | null; error: DbError };
type Mutated = { error: DbError };

interface SelectChain<T> extends PromiseLike<Rows<T>> {
  eq(col: string, val: string | number | boolean): SelectChain<T>;
  in(col: string, vals: readonly string[]): SelectChain<T>;
  is(col: string, val: null): SelectChain<T>;
  order(col: string, opts?: { ascending?: boolean }): SelectChain<T>;
  limit(n: number): SelectChain<T>;
  maybeSingle(): PromiseLike<Single<T>>;
}

interface MutateChain extends PromiseLike<Mutated> {
  eq(col: string, val: string | number | boolean): MutateChain;
}

interface ShimTable<T> {
  select(cols: string): SelectChain<T>;
  insert(row: Record<string, unknown>): PromiseLike<Mutated>;
  update(patch: Record<string, unknown>): MutateChain;
  delete(): MutateChain;
}

type Admin = ReturnType<typeof createAdminClient>;

function shim<T>(admin: Admin, name: string): ShimTable<T> {
  return (
    admin as unknown as { from: (t: string) => ShimTable<T> }
  ).from(name);
}

type ShowcaseLikeRow = {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
};

const SHOWCASE_BUCKET = "showcase";

// =============================================================
// Shared helpers
// =============================================================

/** Look up the authors of a set of projects/comments in one query. */
async function fetchAuthors(
  admin: Admin,
  ids: string[]
): Promise<Map<string, ProjectAuthor>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, ProjectAuthor>();
  if (unique.length === 0) return map;
  const { data } = await admin
    .from("users")
    .select("id, first_name, last_name, avatar_url")
    .in("id", unique);
  for (const u of data ?? []) {
    map.set(u.id, {
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      avatarUrl: u.avatar_url,
    });
  }
  return map;
}

const FALLBACK_AUTHOR: ProjectAuthor = {
  id: "",
  firstName: "Someone",
  lastName: "",
  avatarUrl: null,
};

/** Decorate project rows with their author, like/comment counts, etc. */
async function buildProjectViews(
  admin: Admin,
  rows: ShowcaseProject[],
  viewerId: string
): Promise<ShowcaseProjectView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authors = await fetchAuthors(
    admin,
    rows.map((r) => r.user_id)
  );

  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    shim<ShowcaseLikeRow>(admin, "showcase_likes")
      .select("project_id, user_id")
      .in("project_id", ids),
    shim<ShowcaseCommentRow>(admin, "showcase_comments")
      .select("project_id, deleted_at")
      .in("project_id", ids),
  ]);

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likeRows ?? []) {
    likeCount.set(l.project_id, (likeCount.get(l.project_id) ?? 0) + 1);
    if (l.user_id === viewerId) likedByMe.add(l.project_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of commentRows ?? []) {
    if (c.deleted_at !== null) continue;
    commentCount.set(c.project_id, (commentCount.get(c.project_id) ?? 0) + 1);
  }

  return rows.map((p) => ({
    ...p,
    author: authors.get(p.user_id) ?? FALLBACK_AUTHOR,
    likeCount: likeCount.get(p.id) ?? 0,
    commentCount: commentCount.get(p.id) ?? 0,
    likedByMe: likedByMe.has(p.id),
  }));
}

// =============================================================
// Reads
// =============================================================

/** Every published project, newest first — the public gallery. */
export async function getGalleryProjects(
  viewerId: string
): Promise<ShowcaseProjectView[]> {
  const admin = createAdminClient();
  const { data } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  return buildProjectViews(admin, data ?? [], viewerId);
}

/** All of one student's projects, drafts included. */
export async function getMyProjects(
  userId: string
): Promise<ShowcaseProjectView[]> {
  const admin = createAdminClient();
  const { data } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return buildProjectViews(admin, data ?? [], userId);
}

/** One project with its threaded comments, or null if it doesn't exist. */
export async function getProjectDetail(
  projectId: string,
  viewerId: string
): Promise<{
  project: ShowcaseProjectView;
  comments: ShowcaseCommentView[];
} | null> {
  const admin = createAdminClient();
  const { data: row } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!row) return null;

  const views = await buildProjectViews(admin, [row], viewerId);
  const project = views[0];
  if (!project) return null;

  const { data: commentRows } = await shim<ShowcaseCommentRow>(
    admin,
    "showcase_comments"
  )
    .select("*")
    .eq("project_id", projectId);
  const rows = commentRows ?? [];
  const authors = await fetchAuthors(
    admin,
    rows.map((c) => c.user_id)
  );
  return { project, comments: buildCommentTree(rows, authors) };
}

// =============================================================
// Project writes
// =============================================================

/**
 * Create a draft project row. The id is generated here so the caller knows
 * the storage prefix ("<userId>/<projectId>") before uploading any files.
 */
export async function createProjectRecord(
  userId: string,
  title: string,
  description: string | null
): Promise<
  | { ok: true; id: string; storagePrefix: string }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const storagePrefix = `${userId}/${id}`;
  const { error } = await shim<ShowcaseProject>(
    admin,
    "showcase_projects"
  ).insert({
    id,
    user_id: userId,
    title,
    description,
    storage_prefix: storagePrefix,
    published: false,
    file_count: 0,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id, storagePrefix };
}

/** Record where a freshly-uploaded build lives once its files are in. */
export async function finalizeProjectRecord(
  projectId: string,
  userId: string,
  args: { indexPath: string; fileCount: number; thumbnailPath: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: project } = await shim<ShowcaseProject>(
    admin,
    "showcase_projects"
  )
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found" };
  if (project.user_id !== userId) {
    return { ok: false, error: "Not your project" };
  }

  const { error } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .update({
      index_path: args.indexPath,
      file_count: args.fileCount,
      thumbnail_path: args.thumbnailPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Publish / unpublish. Owner or teacher only. */
export async function setProjectPublishedRecord(
  projectId: string,
  userId: string,
  isTeacher: boolean,
  published: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: project } = await shim<ShowcaseProject>(
    admin,
    "showcase_projects"
  )
    .select("user_id, index_path")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found" };
  if (!isTeacher && project.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  if (published && !project.index_path) {
    return { ok: false, error: "Finish uploading the build first." };
  }

  const { error } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Edit a project's title / description. Owner or teacher only. */
export async function updateProjectMetaRecord(
  projectId: string,
  userId: string,
  isTeacher: boolean,
  title: string,
  description: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: project } = await shim<ShowcaseProject>(
    admin,
    "showcase_projects"
  )
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found" };
  if (!isTeacher && project.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }

  const { error } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Every file path under a storage folder, recursing into subfolders. */
async function listAllFiles(admin: Admin, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data } = await admin.storage
    .from(SHOWCASE_BUCKET)
    .list(prefix, { limit: 1000 });
  // Supabase returns folders with a null id and files with a real one.
  const items = (data ?? []) as Array<{ name: string; id: string | null }>;
  for (const item of items) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) {
      out.push(...(await listAllFiles(admin, path)));
    } else {
      out.push(path);
    }
  }
  return out;
}

/** Delete a project: its build files, then the row (cascades likes/comments). */
export async function deleteProjectRecord(
  projectId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: project } = await shim<ShowcaseProject>(
    admin,
    "showcase_projects"
  )
    .select("user_id, storage_prefix")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: "Project not found" };
  if (!isTeacher && project.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }

  // Best-effort storage cleanup — a failure here shouldn't strand the row.
  try {
    const files = await listAllFiles(admin, project.storage_prefix);
    if (files.length > 0) {
      await admin.storage.from(SHOWCASE_BUCKET).remove(files);
    }
  } catch {
    // ignore — the row delete below is what matters
  }

  const { error } = await shim<ShowcaseProject>(admin, "showcase_projects")
    .delete()
    .eq("id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// =============================================================
// Likes
// =============================================================

/** Toggle the viewer's like on a project. */
export async function toggleLikeRecord(
  projectId: string,
  userId: string
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await shim<ShowcaseLikeRow>(
    admin,
    "showcase_likes"
  )
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await shim<ShowcaseLikeRow>(admin, "showcase_likes")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, liked: false };
  }

  const { error } = await shim<ShowcaseLikeRow>(
    admin,
    "showcase_likes"
  ).insert({
    id: crypto.randomUUID(),
    project_id: projectId,
    user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, liked: true };
}

// =============================================================
// Comments
// =============================================================

/** Add a comment or reply. Returns the project id for revalidation. */
export async function insertCommentRecord(
  projectId: string,
  userId: string,
  body: string,
  parentId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  // A reply must point at a comment on this same project. Threading is one
  // level deep, so a reply-to-a-reply collapses onto the top-level comment.
  let resolvedParent: string | null = null;
  if (parentId) {
    const { data: parent } = await shim<ShowcaseCommentRow>(
      admin,
      "showcase_comments"
    )
      .select("project_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.project_id !== projectId) {
      return { ok: false, error: "Comment not found" };
    }
    resolvedParent = parent.parent_id ?? parentId;
  }

  const { error } = await shim<ShowcaseCommentRow>(
    admin,
    "showcase_comments"
  ).insert({
    id: crypto.randomUUID(),
    project_id: projectId,
    user_id: userId,
    body,
    parent_id: resolvedParent,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Soft-delete a comment. Author or teacher only. */
export async function deleteCommentRecord(
  commentId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; projectId?: string; error?: string }> {
  const admin = createAdminClient();
  const { data: comment } = await shim<ShowcaseCommentRow>(
    admin,
    "showcase_comments"
  )
    .select("user_id, project_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return { ok: false, error: "Comment not found" };

  const byTeacher = isTeacher && comment.user_id !== userId;
  if (!isTeacher && comment.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }

  const { error } = await shim<ShowcaseCommentRow>(admin, "showcase_comments")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_reason: byTeacher ? "removed by teacher" : "removed by author",
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, projectId: comment.project_id };
}
