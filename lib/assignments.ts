// Client-safe: types, labels, and pure helpers only.
// All server queries live in lib/assignments-server.ts. Don't add a
// supabase client import to this file — Client Components depend on it
// (e.g. TextAssignmentEditor → countWords), so importing next/headers
// here would break the build.

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

export const SUPPORTED_TYPES: AssignmentType[] = [
  "code",
  "interactive_html",
  "short_answer",
  "discussion",
];

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
  minimum_word_count: number | null;
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
// Helpers
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

/**
 * Count words in a string. Splits on whitespace after trimming.
 * Empty / whitespace-only string returns 0.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Get the display name for a student in a discussion context.
 * "First name + last initial" per Kira's preference.
 */
export function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (!first && !last) return "Anonymous";
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}

// =============================================================
// Auto-grade computation (interactive HTML)
// =============================================================
export type AutoGrade = {
  autoPoints: number;
  maxAutoPoints: number;
  autoCorrect: number;
  autoTotal: number;
  totalQuestions: number;
  pointsPerQuestion: number;
  hasManualQuestions: boolean;
};

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
  const totalQuestions = Array.isArray(data.responses)
    ? data.responses.length
    : autoTotal;
  if (totalQuestions <= 0) return null;

  const pointsPerQuestion = assignmentPoints / totalQuestions;
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
