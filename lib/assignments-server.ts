import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile } from "@/lib/profile";
import {
  isAssignmentReady,
  type SubmissionEvent,
  type DiscussionPost,
} from "@/lib/assignments";

// =============================================================
// PostgREST select strings.
//
// Kept as `as const` literals so supabase-js can parse the join
// shapes at the type level. Inlined select strings have repeatedly
// been re-wrapped with `+`, which collapses the literal type and
// breaks the parser (every joined property becomes GenericStringError).
// Pulling them up here makes that regression structurally hard to
// reintroduce — there is no `+` to put back.
// =============================================================
const SELECTS = {
  teacherAssignmentsList:
    "id, class_id, assignment_group_id, lesson_id, is_unit_quiz, title, type, due_date, points, published, interactive_html_url, created_at, submissions(count), classes(name, period_number)",
  assignmentWithClass: "*, classes(id, name, period_number)",
  submissionsList:
    "id, user_id, status, submitted_at, updated_at, users(first_name, last_name, username, extended_time), grades(score, graded_at)",
  gradingQueue:
    "id, user_id, assignment_id, submitted_at, status, users(first_name, last_name, extended_time), assignments(id, title, type, due_date, due_date_1_5x, due_date_2x, classes(id, name, period_number))",
  submissionForGrading:
    "*, users(first_name, last_name, username, extended_time), assignments(title, type, instructions, points, due_date, due_date_1_5x, due_date_2x, class_id, interactive_html_url, minimum_word_count, rubric_id), grades(score, feedback, graded_at, rubric_scores)",
  studentAssignmentsList:
    "id, class_id, lesson_id, is_unit_quiz, title, type, due_date, due_date_1_5x, due_date_2x, points, published, interactive_html_url, classes(name, period_number)",
  studentSubmissionsOverlay:
    "assignment_id, status, submitted_at, grades(score)",
  studentAssignment: "*, classes(name, period_number)",
  studentSubmission: "*, grades(score, feedback, graded_at)",
  discussionPosts: "id, content, submitted_at, users(*)",
} as const;

// =============================================================
// Teacher queries
// =============================================================

export async function getAssignmentsForTeacher(classId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("assignments")
    .select(SELECTS.teacherAssignmentsList)
    .order("created_at", { ascending: false });
  if (classId) query = query.eq("class_id", classId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Every per-class copy of one assignment, with its publish state — for the
 * per-class publish panel on the detail page. Copies are found by shared
 * assignment_group_id, falling back to (title, type, lesson, quiz) for older
 * copies that predate the group id.
 */
export async function getAssignmentClassPublishStates(assignment: {
  assignment_group_id: string | null;
  title: string;
  type: string;
  lesson_id: string | null;
  is_unit_quiz: boolean;
}): Promise<
  Array<{
    id: string;
    className: string;
    periodNumber: number | null;
    published: boolean;
    submissionCount: number;
  }>
> {
  const supabase = createAdminClient();
  let query = supabase
    .from("assignments")
    .select(
      "id, published, class_id, classes(name, period_number), submissions(count)"
    );

  if (assignment.assignment_group_id) {
    query = query.eq("assignment_group_id", assignment.assignment_group_id);
  } else {
    query = query
      .eq("title", assignment.title)
      .eq("type", assignment.type as never)
      .eq("is_unit_quiz", assignment.is_unit_quiz);
    query = assignment.lesson_id
      ? query.eq("lesson_id", assignment.lesson_id)
      : query.is("lesson_id", null);
  }

  const { data } = await query;
  const rows = (data ?? []).map((r) => {
    const k = Array.isArray(r.classes) ? r.classes[0] : r.classes;
    const countRow = Array.isArray(r.submissions)
      ? r.submissions[0]
      : r.submissions;
    return {
      id: r.id,
      className: k?.name ?? "Unknown class",
      periodNumber: k?.period_number ?? null,
      published: r.published,
      submissionCount:
        (countRow as { count: number } | null | undefined)?.count ?? 0,
    };
  });
  rows.sort((a, b) => {
    const pa = a.periodNumber ?? 99;
    const pb = b.periodNumber ?? 99;
    return pa !== pb ? pa - pb : a.className.localeCompare(b.className);
  });
  return rows;
}

export async function getAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select(SELECTS.assignmentWithClass)
    .eq("id", assignmentId)
    .single();
  return data;
}

export async function getSubmissionsForAssignment(assignmentId: string) {
  // Teacher-only. Submissions RLS is scoped to each student, so the session
  // client returns nothing here — read with the service role like the other
  // teacher-facing submission queries.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submissions")
    .select(SELECTS.submissionsList)
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function getSubmissionForGrading(submissionId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submissions")
    .select(SELECTS.submissionForGrading)
    .eq("id", submissionId)
    .single();
  return data;
}

/**
 * Every submission still waiting on a grade, across all assignments,
 * oldest first — backs the teacher grading queue.
 */
export async function getGradingQueue() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submissions")
    .select(SELECTS.gradingQueue)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function getSubmissionEvents(submissionId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submission_events")
    .select("*")
    .eq("submission_id", submissionId)
    .order("timestamp", { ascending: true });
  return (data ?? []) as SubmissionEvent[];
}

// =============================================================
// Student queries
// =============================================================

export async function getAssignmentsForStudent(userId: string) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select(SELECTS.studentAssignmentsList)
    .eq("published", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!assignments || assignments.length === 0) return [];

  const readyAssignments = assignments.filter(isAssignmentReady);

  const { data: submissions } = await supabase
    .from("submissions")
    .select(SELECTS.studentSubmissionsOverlay)
    .eq("user_id", userId)
    .in(
      "assignment_id",
      readyAssignments.map((a) => a.id)
    );

  const submissionMap = new Map(
    (submissions ?? []).map((s) => [s.assignment_id, s])
  );

  return readyAssignments.map((a) => ({
    ...a,
    submission: submissionMap.get(a.id) ?? null,
  }));
}

export async function getAssignmentForStudent(
  assignmentId: string,
  userId: string
) {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select(SELECTS.studentAssignment)
    .eq("id", assignmentId)
    .eq("published", true)
    .maybeSingle();
  if (!assignment) return null;
  if (!isAssignmentReady(assignment)) return null;

  const { data: submission } = await supabase
    .from("submissions")
    .select(SELECTS.studentSubmission)
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();

  return { assignment, submission };
}

/**
 * For discussion assignments: get other students' submitted posts.
 * Only called after the current student has submitted their own
 * (enforced in the page that calls this).
 */
export async function getOtherDiscussionPosts(
  assignmentId: string,
  currentUserId: string
): Promise<DiscussionPost[]> {
  // Bypass RLS with the admin client: the default user-scoped policy on
  // `submissions` hides peers' rows from a student, but discussions are
  // supposed to expose them once the student has submitted their own.
  // The auth boundary lives in the calling page (`hasSubmittedDiscussion`).
  const admin = createAdminClient();
  const { data } = await admin
    .from("submissions")
    .select(SELECTS.discussionPosts)
    .eq("assignment_id", assignmentId)
    .neq("user_id", currentUserId)
    .in("status", ["submitted", "graded"])
    .order("submitted_at", { ascending: false, nullsFirst: false });

  return (data ?? []).map((row) => {
    const author = asProfile(
      Array.isArray(row.users) ? row.users[0] : row.users
    );
    return {
      id: row.id,
      content: row.content,
      submitted_at: row.submitted_at,
      authorFirstName: author.first_name,
      authorLastName: author.last_name,
      authorAvatarUrl: author.avatar_url,
    };
  });
}
