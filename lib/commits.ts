// Shared (client-safe) types + helpers for the code-commit history.
// Server-side reads/writes live in app/student/assignments/commit-actions.ts.

export const COMMIT_MESSAGE_MIN = 3;
export const COMMIT_MESSAGE_MAX = 100;
/** Hard cap per submission so a runaway click-fest can't bloat the table. */
export const MAX_COMMITS_PER_SUBMISSION = 300;

/** One row in the History panel — no full code (that loads on demand). */
export type CommitSummary = {
  id: string;
  message: string;
  createdAt: string;
  /** Lines added / removed compared with the commit before it. */
  added: number;
  removed: number;
  restoredFromMessage: string | null;
};

/** A commit's code and the code of the commit before it ("" for the first). */
export type CommitVersions = { code: string; parentCode: string };

export type FetchCommitVersions = (
  commitId: string
) => Promise<{ ok: true; versions: CommitVersions } | { ok: false; error: string }>;

/** Returns an error string, or null when the message is acceptable. */
export function validateCommitMessage(raw: string): string | null {
  const msg = raw.trim();
  if (msg.length < COMMIT_MESSAGE_MIN) {
    return `Write a message of at least ${COMMIT_MESSAGE_MIN} characters describing what you changed.`;
  }
  if (msg.length > COMMIT_MESSAGE_MAX) {
    return `Keep the message under ${COMMIT_MESSAGE_MAX} characters.`;
  }
  return null;
}

/**
 * Rough "+added −removed" line counts between two versions. Uses a
 * multiset of lines rather than a true LCS diff — moved lines don't count
 * as changes, which is fine for a summary and stays O(n).
 */
export function lineChangeStats(
  before: string,
  after: string
): { added: number; removed: number } {
  const counts = new Map<string, number>();
  for (const line of before.split("\n")) {
    const l = line.trimEnd();
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  let added = 0;
  for (const line of after.split("\n")) {
    const l = line.trimEnd();
    const c = counts.get(l) ?? 0;
    if (c > 0) counts.set(l, c - 1);
    else added++;
  }
  let removed = 0;
  for (const c of counts.values()) removed += c;
  return { added, removed };
}
