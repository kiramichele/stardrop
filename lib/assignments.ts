import { createClient } from "@/lib/supabase/server";

export type AssignmentType =
  | "code"
  | "interactive_html"
  | "short_answer"
  | "discussion"
  | "unity_upload"
  | "check_in";

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  code: "Code (Unity C#)",
  interactive_html: "Interactive HTML / Quiz",
  short_answer: "Short answer",
  discussion: "Discussion post",
  unity_upload: "Unity project upload",
  check_in: "Check-in",
};

export const SUPPORTED_TYPES: AssignmentType[] = ["code", "interactive_html"];

export type Assignment = {
  id: string;
  class_id: string;
  lesson_id: string | null;
  title: string;
  type: AssignmentType;
  instructions: string | null;
  due_date: string | null;
  points: number;
  rubric_id: string | null;
  published: boolean;
  interactive_html_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string | null;
  structured_data: unknown;
  uploaded_files: unknown;
  status: "draft" | "submitted" | "graded";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubmissionEvent = {
  id: string;
  submission_id: string;
  event_type: "paste" | "keystroke_batch" | "focus" | "blur";
  payload: { content?: string; length?: number; [key: string]: unknown } | null;
  timestamp: string;
};

export type Grade = {
  id: string;
  submission_id: string;
  score: number;
  feedback: string | null;
  rubric_scores: unknown;
  graded_at: string;
};

// =============================================================
// Lateness helper
// =============================================================
export function computeLateness(
  submittedAt: string | null | undefined,
  dueDate: string | null | undefined
): { isLate: boolean; daysLate: number } {
  if (!submittedAt || !dueDate) return { isLate: false, daysLate: 0 };
  const submitted = new Date(submittedAt).getTime();
  const due = new Date(dueDate).getTime();
  if (submitted <= due) return { isLate: false, daysLate: 0 };
  const daysLate = Math.ceil((submitted - due) / (1000 * 60 * 60 * 24));
  return { isLate: true, daysLate };
}

export function isAssignmentReady(a: {
  type: string;
  interactive_html_url?: string | null;
}) {
  if (a.type === "interactive_html" && !a.interactive_html_url) return false;
  return true;
}

// =============================================================
// Auto-grade computation for interactive HTML assignments
// =============================================================
export type AutoGrade = {
  autoPoints: number;       // points earned from auto-graded questions
  maxAutoPoints: number;    // max possible from auto-graded questions
  autoCorrect: number;      // count of auto-graded questions answered correctly
  autoTotal: number;        // count of auto-graded questions
  totalQuestions: number;   // count of ALL questions (auto-graded + manual)
  pointsPerQuestion: number;
  hasManualQuestions: boolean;
};

/**
 * Given the structured_data from an interactive HTML submission and the
 * assignment's total points, compute the auto-graded portion.
 *
 * Returns null if the data doesn't contain a usable score.
 */
export function computeAutoGrade(
  structuredData: unknown,
  assignmentPoints: number
): AutoGrade | null {
  if (!structuredData || typeof structuredData !== "object") return null;
  const data = structuredData as {
    score?: { earned?: unknown; max?: unknown };
    responses?: unknown[];
  };

  if (
    !data.score ||
    typeof data.score.earned !== "number" ||
    typeof data.score.max !== "number" ||
    data.score.max <= 0
  ) {
    return null;
  }

  const earned = data.score.earned;
  const autoTotal = data.score.max;

  // Total questions = full responses array length if available, else
  // assume score.max covers everything.
  const totalQuestions = Array.isArray(data.responses)
    ? data.responses.length
    : autoTotal;
  if (totalQuestions <= 0) return null;

  const pointsPerQuestion = assignmentPoints / totalQuestions;
  // Round to 2 decimals to avoid floating-point ugliness
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    autoPoints: round(pointsPerQuestion * earned),
    maxAutoPoints: round(pointsPerQuestion * autoTotal),
    autoCorrect: earned,
    autoTotal,
    totalQuestions,
    pointsPerQuestion: round(pointsPerQuestion),
    hasManualQuestions: totalQuestions > autoTotal,
  };
}

// =============================================================
// Teacher queries
// =============================================================

export async function getAssignmentsForTeacher(classId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("assignments")
    .select(
      "id, class_id, title, type, due_date, points, published, interactive_html_url, created_at, submissions(count), classes(name, period_number)"
    )
    .order("created_at", { ascending: false });
  if (classId) query = query.eq("class_id", classId);
  const { data } = await query;
  return data ?? [];
}

export async function getAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*, classes(id, name, period_number)")
    .eq("id", assignmentId)
    .single();
  return data;
}

export async function getSubmissionsForAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, user_id, status, submitted_at, updated_at, users(first_name, last_name, username), grades(score, graded_at)"
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function getSubmissionForGrading(submissionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "*, users(first_name, last_name, username), assignments(title, type, instructions, points, due_date, class_id, interactive_html_url), grades(score, feedback, graded_at)"
    )
    .eq("id", submissionId)
    .single();
  return data;
}

export async function getSubmissionEvents(submissionId: string) {
  const supabase = await createClient();
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
    .select(
      "id, class_id, title, type, due_date, points, published, interactive_html_url, classes(name, period_number)"
    )
    .eq("published", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!assignments || assignments.length === 0) return [];

  const readyAssignments = assignments.filter(isAssignmentReady);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("assignment_id, status, submitted_at, grades(score)")
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
    .select("*, classes(name, period_number)")
    .eq("id", assignmentId)
    .eq("published", true)
    .maybeSingle();
  if (!assignment) return null;
  if (!isAssignmentReady(assignment)) return null;

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, grades(score, feedback, graded_at)")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();

  return { assignment, submission };
}