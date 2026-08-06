import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  shuffle,
  buildReviewGraph,
  wordCount,
  type PeerReviewRow,
  type PeerStudent,
} from "@/lib/peer-review";

// All access here is via the service-role client; the give-to-get gate and
// double-blind hiding are enforced in code (students never receive a
// reviewer/reviewee identity).

type Admin = ReturnType<typeof createAdminClient>;

type PeerAssignment = {
  id: string;
  class_id: string;
  source_assignment_id: string | null;
  minimum_word_count: number | null;
  points: number;
  title: string;
};

async function getPeerAssignment(
  admin: Admin,
  assignmentId: string
): Promise<PeerAssignment | null> {
  const { data } = await admin
    .from("assignments")
    .select(
      "id, class_id, source_assignment_id, minimum_word_count, points, title"
    )
    .eq("id", assignmentId)
    .maybeSingle();
  return (data as PeerAssignment | null) ?? null;
}

async function getRoster(admin: Admin, classId: string): Promise<PeerStudent[]> {
  const { data } = await admin
    .from("enrollments")
    .select("users(id, first_name, last_name, role)")
    .eq("class_id", classId);
  return (data ?? [])
    .map((e) => (Array.isArray(e.users) ? e.users[0] : e.users))
    .filter(
      (u): u is { id: string; first_name: string; last_name: string; role: string } =>
        !!u && u.role === "student"
    )
    .map((u) => ({ id: u.id, firstName: u.first_name, lastName: u.last_name }))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

async function loadMatchups(
  admin: Admin,
  assignmentId: string
): Promise<PeerReviewRow[]> {
  const { data } = await admin
    .from("peer_reviews")
    .select("*")
    .eq("assignment_id", assignmentId);
  return (data ?? []) as PeerReviewRow[];
}

// =============================================================
// Teacher view — pairing board + moderation
// =============================================================

export type TeacherPeerReview = {
  sourceTitle: string | null;
  sourceAssignmentId: string | null;
  students: PeerStudent[];
  matchups: PeerReviewRow[];
  /** Student ids who have a submission to the source assignment. */
  sourceSubmitters: string[];
};

export async function getTeacherPeerReview(
  assignmentId: string
): Promise<TeacherPeerReview | null> {
  const admin = createAdminClient();
  const assignment = await getPeerAssignment(admin, assignmentId);
  if (!assignment) return null;

  const [students, matchups] = await Promise.all([
    getRoster(admin, assignment.class_id),
    loadMatchups(admin, assignmentId),
  ]);

  let sourceTitle: string | null = null;
  const sourceSubmitters: string[] = [];
  if (assignment.source_assignment_id) {
    const { data: src } = await admin
      .from("assignments")
      .select("title")
      .eq("id", assignment.source_assignment_id)
      .maybeSingle();
    sourceTitle = src?.title ?? null;
    const { data: subs } = await admin
      .from("submissions")
      .select("user_id, status")
      .eq("assignment_id", assignment.source_assignment_id)
      .in("status", ["submitted", "graded"]);
    for (const s of subs ?? []) sourceSubmitters.push(s.user_id);
  }

  return {
    sourceTitle,
    sourceAssignmentId: assignment.source_assignment_id,
    students,
    matchups,
    sourceSubmitters,
  };
}

// =============================================================
// Pairing operations (called from server actions)
// =============================================================

function findMutualPair(rows: PeerReviewRow[]): [string, string] | null {
  for (const m of rows) {
    if (m.submitted_at) continue;
    const back = rows.find(
      (x) =>
        x.reviewer_id === m.reviewee_id &&
        x.reviewee_id === m.reviewer_id &&
        !x.submitted_at
    );
    if (back) return [m.reviewer_id, m.reviewee_id];
  }
  return null;
}

/** Re-shuffle everyone into fresh pairs (blocked once anyone has submitted). */
export async function randomizePairs(
  assignmentId: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const assignment = await getPeerAssignment(admin, assignmentId);
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const existing = await loadMatchups(admin, assignmentId);
  if (existing.some((m) => m.submitted_at)) {
    return {
      ok: false,
      error:
        "Some students already submitted feedback — use “Auto-assign unpaired” instead of a full re-shuffle.",
    };
  }

  const students = await getRoster(admin, assignment.class_id);
  if (students.length < 2) {
    return { ok: false, error: "Need at least two students to pair." };
  }

  await admin.from("peer_reviews").delete().eq("assignment_id", assignmentId);
  const edges = buildReviewGraph(shuffle(students.map((s) => s.id)));
  if (edges.length > 0) {
    await admin.from("peer_reviews").insert(
      edges.map(([reviewer, reviewee]) => ({
        assignment_id: assignmentId,
        reviewer_id: reviewer,
        reviewee_id: reviewee,
      }))
    );
  }
  return { ok: true };
}

/** Pair up any students not yet in a matchup, leaving existing pairs intact. */
export async function autoAssignUnpaired(
  assignmentId: string
): Promise<{ ok: boolean; error?: string; paired?: number }> {
  const admin = createAdminClient();
  const assignment = await getPeerAssignment(admin, assignmentId);
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const students = await getRoster(admin, assignment.class_id);
  const rows = await loadMatchups(admin, assignmentId);
  const reviewers = new Set(rows.map((m) => m.reviewer_id));
  const reviewees = new Set(rows.map((m) => m.reviewee_id));
  const fully = students.filter(
    (s) => !reviewers.has(s.id) && !reviewees.has(s.id)
  );
  if (fully.length === 0) return { ok: true, paired: 0 };

  if (fully.length === 1) {
    // Splice the lone student into an existing pair → round-robin trio.
    const pair = findMutualPair(rows);
    if (!pair) {
      return {
        ok: false,
        error:
          "Only one student is unpaired and there's no free pair to grow into a trio. Randomize first.",
      };
    }
    const [a, b] = pair; // a↔b; rewrite to a→b, b→lone, lone→a
    const lone = fully[0].id;
    await admin
      .from("peer_reviews")
      .update({ reviewee_id: lone })
      .eq("assignment_id", assignmentId)
      .eq("reviewer_id", b)
      .eq("reviewee_id", a);
    await admin.from("peer_reviews").insert({
      assignment_id: assignmentId,
      reviewer_id: lone,
      reviewee_id: a,
    });
    return { ok: true, paired: 1 };
  }

  const edges = buildReviewGraph(shuffle(fully.map((s) => s.id)));
  if (edges.length > 0) {
    await admin.from("peer_reviews").insert(
      edges.map(([reviewer, reviewee]) => ({
        assignment_id: assignmentId,
        reviewer_id: reviewer,
        reviewee_id: reviewee,
      }))
    );
  }
  return { ok: true, paired: fully.length };
}

/** Manually pair two currently-unpaired students (mutual). */
export async function setManualPair(
  assignmentId: string,
  aId: string,
  bId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!aId || !bId || aId === bId) {
    return { ok: false, error: "Pick two different students." };
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("peer_reviews")
    .select("reviewer_id")
    .eq("assignment_id", assignmentId)
    .in("reviewer_id", [aId, bId]);
  if ((existing ?? []).length > 0) {
    return { ok: false, error: "One of them is already paired — unpair first." };
  }
  await admin.from("peer_reviews").insert([
    { assignment_id: assignmentId, reviewer_id: aId, reviewee_id: bId },
    { assignment_id: assignmentId, reviewer_id: bId, reviewee_id: aId },
  ]);
  return { ok: true };
}

/** Remove a student from their matchup (unless they've already submitted). */
export async function unpairStudent(
  assignmentId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const rows = await loadMatchups(admin, assignmentId);
  const involved = rows.filter(
    (m) => m.reviewer_id === userId || m.reviewee_id === userId
  );
  if (involved.some((m) => m.submitted_at)) {
    return { ok: false, error: "Can't unpair — feedback was already submitted." };
  }
  await admin
    .from("peer_reviews")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("reviewer_id", userId);
  await admin
    .from("peer_reviews")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("reviewee_id", userId);
  return { ok: true };
}

// =============================================================
// Student view — review screen + submit (with the give-to-get gate)
// =============================================================

export type StudentPeerReview = {
  minimumWords: number;
  /** The work to review (double-blind — no author identity). */
  reviewee:
    | { paired: true; hasSubmission: boolean; content: string | null; sourceTitle: string | null }
    | { paired: false }; // not yet assigned a partner
  myFeedback: { body: string | null; submittedAt: string | null };
  /** Feedback received — gated behind giving yours first; never names anyone. */
  received:
    | { state: "none" } // no one is assigned to review me yet
    | { state: "locked" } // must submit my feedback first
    | { state: "waiting" } // I submitted; my reviewer hasn't
    | { state: "unlocked"; body: string };
};

export async function getStudentPeerReview(
  assignmentId: string,
  userId: string
): Promise<StudentPeerReview | null> {
  const admin = createAdminClient();
  const assignment = await getPeerAssignment(admin, assignmentId);
  if (!assignment) return null;

  const rows = await loadMatchups(admin, assignmentId);
  const mine = rows.find((m) => m.reviewer_id === userId) ?? null;
  const incoming = rows.find((m) => m.reviewee_id === userId) ?? null;

  let reviewee: StudentPeerReview["reviewee"] = { paired: false };
  if (mine) {
    let hasSubmission = false;
    let content: string | null = null;
    let sourceTitle: string | null = null;
    if (assignment.source_assignment_id) {
      const { data: src } = await admin
        .from("assignments")
        .select("title")
        .eq("id", assignment.source_assignment_id)
        .maybeSingle();
      sourceTitle = src?.title ?? null;
      const { data: sub } = await admin
        .from("submissions")
        .select("content, status")
        .eq("assignment_id", assignment.source_assignment_id)
        .eq("user_id", mine.reviewee_id)
        .in("status", ["submitted", "graded"])
        .maybeSingle();
      if (sub) {
        hasSubmission = true;
        content = sub.content;
      }
    }
    reviewee = { paired: true, hasSubmission, content, sourceTitle };
  }

  const iSubmitted = !!mine?.submitted_at;
  let received: StudentPeerReview["received"];
  if (!incoming) received = { state: "none" };
  else if (!iSubmitted) received = { state: "locked" };
  else if (incoming.submitted_at && incoming.body)
    received = { state: "unlocked", body: incoming.body };
  else received = { state: "waiting" };

  return {
    minimumWords: assignment.minimum_word_count ?? 0,
    reviewee,
    myFeedback: { body: mine?.body ?? null, submittedAt: mine?.submitted_at ?? null },
    received,
  };
}

/** Submit the feedback a student wrote about their partner + award completion. */
export async function submitPeerFeedback(
  assignmentId: string,
  userId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const assignment = await getPeerAssignment(admin, assignmentId);
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const { data: mine } = await admin
    .from("peer_reviews")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("reviewer_id", userId)
    .maybeSingle();
  if (!mine) {
    return {
      ok: false,
      error:
        "You haven't been paired yet — check back once your teacher assigns partners.",
    };
  }
  if (mine.submitted_at) {
    return { ok: false, error: "You already submitted your feedback." };
  }

  const text = body.trim();
  if (!text) return { ok: false, error: "Write some feedback first." };
  const min = assignment.minimum_word_count ?? 0;
  if (min > 0 && wordCount(text) < min) {
    return { ok: false, error: `Please write at least ${min} words.` };
  }

  const now = new Date().toISOString();
  await admin
    .from("peer_reviews")
    .update({ body: text, submitted_at: now })
    .eq("id", mine.id);

  // Completion credit: a graded submission for this peer-review assignment.
  const { data: existingSub } = await admin
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();
  let submissionId = existingSub?.id ?? null;
  if (submissionId) {
    await admin
      .from("submissions")
      .update({ status: "graded", submitted_at: now, content: "Peer feedback submitted" })
      .eq("id", submissionId);
  } else {
    const { data: ins } = await admin
      .from("submissions")
      .insert({
        assignment_id: assignmentId,
        user_id: userId,
        status: "graded",
        submitted_at: now,
        content: "Peer feedback submitted",
      })
      .select("id")
      .single();
    submissionId = ins?.id ?? null;
  }
  if (submissionId) {
    const { data: g } = await admin
      .from("grades")
      .select("id")
      .eq("submission_id", submissionId)
      .maybeSingle();
    if (!g) {
      await admin.from("grades").insert({
        submission_id: submissionId,
        score: assignment.points,
        graded_at: now,
      });
    }
  }

  return { ok: true };
}
