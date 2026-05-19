import { createClient } from "@/lib/supabase/server";

export type AssignmentType = "code" | "written" | "discussion" | "upload";

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  code: "Code (Unity C#)",
  written: "Written response",
  discussion: "Discussion post",
  upload: "File upload",
};

// Types currently fully implemented end-to-end
export const SUPPORTED_TYPES: AssignmentType[] = ["code"];

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

// =============================================================
// Teacher queries
// =============================================================

export async function getAssignmentsForTeacher(classId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("assignments")
    .select(
      "id, class_id, title, type, due_date, points, published, created_at, submissions(count), classes(name, period_number)"
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
      "*, users(first_name, last_name, username), assignments(title, type, instructions, points, due_date, class_id), grades(score, feedback, graded_at)"
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
      "id, class_id, title, type, due_date, points, published, classes(name, period_number)"
    )
    .eq("published", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!assignments || assignments.length === 0) return [];

  const { data: submissions } = await supabase
    .from("submissions")
    .select("assignment_id, status, submitted_at, grades(score)")
    .eq("user_id", userId)
    .in(
      "assignment_id",
      assignments.map((a) => a.id)
    );

  const submissionMap = new Map(
    (submissions ?? []).map((s) => [s.assignment_id, s])
  );

  return assignments.map((a) => ({
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

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, grades(score, feedback, graded_at)")
    .eq("assignment_id", assignmentId)
    .eq("user_id", userId)
    .maybeSingle();

  return { assignment, submission };
}
