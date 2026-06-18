// Client-safe: devlog-wall types + comment tree builder + author display.
// Server-only queries live in lib/devlog-wall-server.ts.

import type { SubmissionMedia } from "@/lib/assignments";

export type DevlogAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

/** One devlog as rendered on the /devlogs wall. */
export type DevlogFeedItem = {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  author: DevlogAuthor;
  video: SubmissionMedia;
  submittedAt: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

/** A row from submission_comments. */
export type SubmissionCommentRow = {
  id: string;
  submission_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
};

/** Comment with author + replies, ready to render. */
export type SubmissionCommentView = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  deleted: boolean;
  deletedReason: string | null;
  author: DevlogAuthor;
  replies: SubmissionCommentView[];
};

/** First name + last initial — privacy-friendly display. */
export function devlogAuthorName(a: DevlogAuthor): string {
  const first = a.firstName.trim();
  const last = a.lastName.trim();
  if (!first && !last) return "Someone";
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}

/**
 * Flat comment rows -> two-level tree (top-level + replies). Deleted
 * rows are kept as tombstones so replies underneath survive.
 */
export function buildSubmissionCommentTree(
  rows: SubmissionCommentRow[],
  authors: Map<string, DevlogAuthor>
): SubmissionCommentView[] {
  const fallback: DevlogAuthor = {
    id: "",
    firstName: "Someone",
    lastName: "",
    avatarUrl: null,
  };
  const toView = (r: SubmissionCommentRow): SubmissionCommentView => ({
    id: r.id,
    parentId: r.parent_id,
    body: r.body,
    createdAt: r.created_at,
    deleted: r.deleted_at !== null,
    deletedReason: r.deleted_reason,
    author: authors.get(r.user_id) ?? fallback,
    replies: [],
  });

  const sorted = [...rows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const byId = new Map<string, SubmissionCommentView>();
  for (const r of sorted) byId.set(r.id, toView(r));

  const roots: SubmissionCommentView[] = [];
  for (const r of sorted) {
    const view = byId.get(r.id);
    if (!view) continue;
    const parent = r.parent_id ? byId.get(r.parent_id) : null;
    if (parent) parent.replies.push(view);
    else roots.push(view);
  }
  return roots;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic short date — no locale / timezone drift on hydration. */
export function formatDevlogDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return "";
  const monthIndex = Number(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return "";
  return `${MONTHS[monthIndex]} ${Number(parts[2])}, ${parts[0]}`;
}
