// Client-safe: showcase types and pure helpers only. Both Server and
// Client Components import this, so keep server-only imports out.

// =============================================================
// Types
// =============================================================

/** A row from showcase_projects. */
export type ShowcaseProject = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  storage_prefix: string;
  index_path: string | null;
  thumbnail_path: string | null;
  file_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** A row from showcase_comments. */
export type ShowcaseCommentRow = {
  id: string;
  project_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
};

/** The slice of a user needed to credit a project or comment. */
export type ProjectAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

/** A project plus the counts and author the gallery/detail views render. */
export type ShowcaseProjectView = ShowcaseProject & {
  author: ProjectAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

/** A comment with its author and nested replies, ready to render. */
export type ShowcaseCommentView = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  deleted: boolean;
  deletedReason: string | null;
  author: ProjectAuthor;
  replies: ShowcaseCommentView[];
};

// =============================================================
// Build-archive helpers (used by the browser upload flow)
// =============================================================

/** Junk paths that macOS / Windows zip tools sprinkle into archives. */
function isJunkPath(path: string): boolean {
  return (
    path.startsWith("__MACOSX/") ||
    path.includes("/.DS_Store") ||
    path.endsWith("/.DS_Store") ||
    path === ".DS_Store" ||
    path.split("/").some((seg) => seg.startsWith("._"))
  );
}

/**
 * Find the folder inside a Unity WebGL zip that holds index.html — the
 * build root. A zip may have the build at its top level or nested one
 * folder deep; we pick the shallowest index.html. Returns the prefix to
 * strip from every path (e.g. "MyGame/"), or null when there's no
 * index.html at all.
 */
export function findBuildRoot(paths: string[]): string | null {
  const indexes = paths
    .filter((p) => !isJunkPath(p))
    .filter((p) => p === "index.html" || p.endsWith("/index.html"));
  if (indexes.length === 0) return null;
  indexes.sort((a, b) => a.length - b.length);
  const shallowest = indexes[0];
  return shallowest.slice(0, shallowest.length - "index.html".length);
}

/** One file pulled out of an uploaded build zip. */
export type BuildFile = {
  /** Path of the file inside the zip. */
  zipPath: string;
  /** Path relative to the build root, e.g. "Build/game.wasm". */
  relativePath: string;
};

/**
 * Given every path in a zip and the build root, list the files that should
 * be uploaded (skips folders, junk, and anything outside the build root).
 */
export function collectBuildFiles(
  paths: string[],
  buildRoot: string
): BuildFile[] {
  return paths
    .filter((p) => !p.endsWith("/")) // folders
    .filter((p) => !isJunkPath(p))
    .filter((p) => p.startsWith(buildRoot))
    .map((p) => ({ zipPath: p, relativePath: p.slice(buildRoot.length) }))
    .filter((f) => f.relativePath.length > 0);
}

/**
 * MIME type for a build file, keyed off its extension. Unity's loader
 * needs ".wasm" served as application/wasm for streaming compilation, so
 * we set the type explicitly on every upload rather than trusting guesses.
 */
export function mimeForPath(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    js: "text/javascript",
    mjs: "text/javascript",
    wasm: "application/wasm",
    json: "application/json",
    css: "text/css",
    txt: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    cur: "image/x-icon",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  // ".data", ".unityweb", ".br", ".gz", ".mem" and friends: raw bytes.
  return map[ext] ?? "application/octet-stream";
}

// =============================================================
// Storage URL
// =============================================================

/** Public URL for a file in the `showcase` storage bucket. */
export function publicShowcaseUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/+$/,
    ""
  );
  return `${base}/storage/v1/object/public/showcase/${storagePath}`;
}

// =============================================================
// Comment tree
// =============================================================

/**
 * Turn a flat list of comment rows into a two-level tree (top-level
 * comments, each with their replies). Both levels are oldest-first.
 * Deleted comments are kept as tombstones so replies underneath survive.
 */
export function buildCommentTree(
  rows: ShowcaseCommentRow[],
  authors: Map<string, ProjectAuthor>
): ShowcaseCommentView[] {
  const fallback: ProjectAuthor = {
    id: "",
    firstName: "Someone",
    lastName: "",
    avatarUrl: null,
  };
  const toView = (r: ShowcaseCommentRow): ShowcaseCommentView => ({
    id: r.id,
    parentId: r.parent_id,
    body: r.body,
    createdAt: r.created_at,
    deleted: r.deleted_at !== null,
    deletedReason: r.deleted_reason,
    author: authors.get(r.user_id) ?? fallback,
    replies: [],
  });

  const byCreated = [...rows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const views = new Map<string, ShowcaseCommentView>();
  for (const r of byCreated) views.set(r.id, toView(r));

  const roots: ShowcaseCommentView[] = [];
  for (const r of byCreated) {
    const view = views.get(r.id);
    if (!view) continue;
    const parent = r.parent_id ? views.get(r.parent_id) : null;
    if (parent) parent.replies.push(view);
    else roots.push(view);
  }
  return roots;
}

/** Display name for a project author — first name + last initial. */
export function authorName(author: ProjectAuthor): string {
  const first = author.firstName.trim();
  const last = author.lastName.trim();
  if (!first && !last) return "Anonymous";
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Format a timestamp's date as "May 20, 2026". Reads the YYYY-MM-DD
 * straight off the ISO string so it renders identically on server and
 * client (no timezone drift, no hydration mismatch).
 */
export function formatShowcaseDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return "";
  const monthIndex = Number(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${MONTHS[monthIndex]} ${Number(parts[2])}, ${parts[0]}`;
}
