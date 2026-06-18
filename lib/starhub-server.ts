import { createAdminClient } from "@/lib/supabase/admin";
import { parseSubmissionMedia } from "@/lib/assignments";
import type {
  PortfolioEntry,
  PortfolioGist,
  StarHubIdentity,
} from "@/lib/starhub";

// Tables touched here that aren't fully in types/database.ts (until a
// regen runs after the matching migration is applied):
//   - portfolio_gists (new this migration)
//   - users.bio / users.studio (new this migration)
//   - assignments.auto_publish_to_starhub (new this migration)
//   - submissions.is_public (added a couple migrations ago)
//   - showcase_projects (added a few migrations ago)
//
// All access goes through the same typed-cast shim pattern as the rest
// of the recent migrations so the build is safe either way.

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

// =============================================================
// Row types for the shim
// =============================================================

type UserIdentityRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  studio: string | null;
};

type SubmissionPortfolioRow = {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string | null;
  structured_data: unknown;
  uploaded_files: unknown;
  is_public: boolean;
  submitted_at: string | null;
  created_at: string | null;
  assignments:
    | { title: string; type: string; points: number }
    | { title: string; type: string; points: number }[]
    | null;
  grades:
    | { score: number | null }
    | { score: number | null }[]
    | null;
};

type ShowcaseRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  index_path: string | null;
  published: boolean;
  created_at: string;
};

type AssignmentAutoPublishRow = {
  id: string;
  auto_publish_to_starhub: boolean | null;
  type: string;
};

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// =============================================================
// Identity
// =============================================================

export async function getStudentIdentityByUsername(
  username: string
): Promise<StarHubIdentity | null> {
  const admin = createAdminClient();
  const { data } = await shim<UserIdentityRow>(admin, "users")
    .select("id, username, first_name, last_name, avatar_url, bio, studio")
    .eq("username", username)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    studio: data.studio,
  };
}

export async function updateIdentityFields(
  userId: string,
  patch: { bio?: string | null; studio?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await shim<UserIdentityRow>(admin, "users")
    .update(patch)
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// =============================================================
// Portfolio feed
// =============================================================

/**
 * Build the StarHub feed for one student. Owner / teacher see private
 * gists too; everyone else gets only public entries. Submissions on the
 * portfolio always require `is_public = true` (private submissions are
 * just submissions — they don't clutter the portfolio).
 */
export async function getPortfolioEntries(
  targetUserId: string,
  options: { canSeePrivate: boolean }
): Promise<PortfolioEntry[]> {
  const admin = createAdminClient();
  const [{ data: subs }, { data: gists }, { data: shows }] = await Promise.all([
    shim<SubmissionPortfolioRow>(admin, "submissions")
      .select(
        "id, user_id, assignment_id, content, structured_data, uploaded_files, is_public, submitted_at, created_at, assignments(title, type, points), grades(score)"
      )
      .eq("user_id", targetUserId)
      .eq("is_public", true)
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    options.canSeePrivate
      ? shim<PortfolioGist>(admin, "portfolio_gists")
          .select("*")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
      : shim<PortfolioGist>(admin, "portfolio_gists")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
    shim<ShowcaseRow>(admin, "showcase_projects")
      .select(
        "id, user_id, title, description, thumbnail_path, index_path, published, created_at"
      )
      .eq("user_id", targetUserId)
      .eq("published", true)
      .order("created_at", { ascending: false }),
  ]);

  const out: PortfolioEntry[] = [];

  for (const s of subs ?? []) {
    const assignment = one(s.assignments);
    if (!assignment) continue;
    const grade = one(s.grades);
    out.push({
      kind: "submission",
      id: s.id,
      title: assignment.title,
      assignmentId: s.assignment_id,
      assignmentType: assignment.type,
      content: s.content,
      structuredData: s.structured_data,
      uploadedFiles: parseSubmissionMedia(s.uploaded_files),
      score: grade?.score ?? null,
      maxPoints: assignment.points,
      isPublic: s.is_public,
      createdAt: s.submitted_at ?? s.created_at ?? new Date().toISOString(),
    });
  }

  for (const g of gists ?? []) {
    out.push({
      kind: "gist",
      id: g.id,
      title: g.title,
      description: g.description,
      language: g.language,
      code: g.code,
      isPublic: g.is_public,
      createdAt: g.created_at,
    });
  }

  for (const sp of shows ?? []) {
    out.push({
      kind: "showcase",
      id: sp.id,
      title: sp.title,
      description: sp.description,
      thumbnailPath: sp.thumbnail_path,
      indexPath: sp.index_path,
      isPublic: sp.published,
      createdAt: sp.created_at,
    });
  }

  // Single chronological feed across all kinds.
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

// =============================================================
// Gists (CRUD)
// =============================================================

export async function getGist(gistId: string): Promise<PortfolioGist | null> {
  const admin = createAdminClient();
  const { data } = await shim<PortfolioGist>(admin, "portfolio_gists")
    .select("*")
    .eq("id", gistId)
    .maybeSingle();
  return data;
}

export async function insertGistRecord(
  userId: string,
  args: {
    title: string;
    description: string | null;
    language: string;
    code: string;
    isPublic: boolean;
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await shim<PortfolioGist>(admin, "portfolio_gists").insert({
    id,
    user_id: userId,
    title: args.title,
    description: args.description,
    language: args.language,
    code: args.code,
    is_public: args.isPublic,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id };
}

export async function updateGistRecord(
  gistId: string,
  userId: string,
  isTeacher: boolean,
  patch: Partial<{
    title: string;
    description: string | null;
    language: string;
    code: string;
    is_public: boolean;
  }>
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await shim<PortfolioGist>(admin, "portfolio_gists")
    .select("user_id")
    .eq("id", gistId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Gist not found" };
  if (!isTeacher && existing.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await shim<PortfolioGist>(admin, "portfolio_gists")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", gistId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteGistRecord(
  gistId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const admin = createAdminClient();
  const { data: existing } = await shim<PortfolioGist>(admin, "portfolio_gists")
    .select("user_id")
    .eq("id", gistId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Gist not found" };
  if (!isTeacher && existing.user_id !== userId) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await shim<PortfolioGist>(admin, "portfolio_gists")
    .delete()
    .eq("id", gistId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, userId: existing.user_id };
}

// =============================================================
// Assignment auto-publish lookup (used by the submit hook)
// =============================================================

export async function getAssignmentAutoPublish(
  assignmentId: string
): Promise<{ autoPublish: boolean; type: string } | null> {
  const admin = createAdminClient();
  const { data } = await shim<AssignmentAutoPublishRow>(admin, "assignments")
    .select("id, auto_publish_to_starhub, type")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!data) return null;
  return {
    autoPublish: Boolean(data.auto_publish_to_starhub),
    type: data.type,
  };
}
