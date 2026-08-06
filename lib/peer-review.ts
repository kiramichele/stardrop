// Client-safe peer-review types + pure pairing helpers.
//
// Peer review is double-blind: students never see who they're reviewing or who
// reviewed them (only the teacher does). Each student reviews exactly one
// classmate and is reviewed by exactly one — pairs review each other, and an
// odd class ends in a round-robin trio.

export type PeerReviewRow = {
  id: string;
  assignment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  body: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type PeerStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

/** Fisher–Yates shuffle — returns a new array, leaves the input untouched. */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Turn an ordered list of student ids into reviewer→reviewee edges.
 * Consecutive students form mutual pairs; when the count is odd the final three
 * form a round-robin trio (A→B, B→C, C→A). Everyone gives and receives exactly
 * one review and no one reviews themselves. Fewer than 2 ids yields no edges.
 */
export function buildReviewGraph(ids: string[]): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  const n = ids.length;
  if (n < 2) return edges;

  const pairEnd = n % 2 === 0 ? n : n - 3; // leave the last three for a trio
  for (let i = 0; i < pairEnd; i += 2) {
    edges.push([ids[i], ids[i + 1]]);
    edges.push([ids[i + 1], ids[i]]);
  }
  if (n % 2 === 1) {
    const a = ids[n - 3];
    const b = ids[n - 2];
    const c = ids[n - 1];
    edges.push([a, b], [b, c], [c, a]);
  }
  return edges;
}

/** Count the words in a feedback body, for the minimum-length gate. */
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
