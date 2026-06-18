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
  | "devlog"
  | "video_response"
  | "check_in";

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  code: "Code (Unity C#)",
  interactive_html: "Interactive HTML / Quiz",
  short_answer: "Short answer",
  discussion: "Discussion post",
  unity_upload: "Unity project upload",
  devlog: "Dev log (screen recording or video)",
  video_response: "Video response (camera / screen / upload)",
  check_in: "Check-in",
};

export const SUPPORTED_TYPES: AssignmentType[] = [
  "code",
  "interactive_html",
  "short_answer",
  "discussion",
  "unity_upload",
  "devlog",
  "video_response",
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

/**
 * One file uploaded as part of a unity_upload or devlog submission. The
 * full list lives on `submissions.uploaded_files` (JSONB).
 *
 * `bucket` distinguishes the storage bucket the file lives in. Older
 * records (unity_upload) predate this field — when it's missing, the
 * file lives in the `submissions` bucket.
 */
export type SubmissionMedia = {
  id: string;
  kind: "image" | "video";
  storagePath: string;
  mime: string;
  size: number;
  createdAt: string;
  bucket?: "submissions" | "devlogs";
};

/** One submitted discussion post, flattened with its author for rendering. */
export type DiscussionPost = {
  id: string;
  content: string | null;
  submitted_at: string | null;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
};

/** Safely narrows the JSONB uploaded_files column to a typed array. */
export function parseSubmissionMedia(value: unknown): SubmissionMedia[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SubmissionMedia =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SubmissionMedia).id === "string" &&
      typeof (item as SubmissionMedia).storagePath === "string"
  );
}

/**
 * Path of the auth-gated proxy route for one submission media file.
 * Picks the right proxy by bucket so unity_upload (submissions bucket)
 * and devlog (devlogs bucket) both Just Work.
 */
export function submissionMediaUrl(m: SubmissionMedia): string {
  const bucket = m.bucket ?? "submissions";
  return `/api/files/${bucket}/${m.storagePath}`;
}

// =============================================================
// Helpers
// =============================================================

/**
 * Letter grade for a percentage, standard US scale. One spot to change
 * if the class ever uses different cutoffs.
 */
export function letterGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

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
// Extended-time accommodations
// =============================================================

/** A student's extended-time tier. */
export type ExtendedTime = "none" | "1.5x" | "2x";

export const EXTENDED_TIME_VALUES: ExtendedTime[] = ["none", "1.5x", "2x"];

export const EXTENDED_TIME_LABELS: Record<ExtendedTime, string> = {
  none: "Regular time",
  "1.5x": "1.5× extended time",
  "2x": "2× (double) time",
};

/** Coerce an unknown value to a valid extended-time tier. */
export function asExtendedTime(value: unknown): ExtendedTime {
  return value === "1.5x" || value === "2x" ? value : "none";
}

/**
 * The due date a student is actually held to, given their tier. A blank
 * tier date falls back to the next-shorter one, ending at the regular date.
 * Accepts a raw `string` tier so it works directly on database rows.
 */
export function effectiveDueDate(
  assignment: {
    due_date: string | null;
    due_date_1_5x?: string | null;
    due_date_2x?: string | null;
  },
  tier: string | null | undefined
): string | null {
  if (tier === "2x") {
    return (
      assignment.due_date_2x ?? assignment.due_date_1_5x ?? assignment.due_date
    );
  }
  if (tier === "1.5x") {
    return assignment.due_date_1_5x ?? assignment.due_date;
  }
  return assignment.due_date;
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

// =============================================================
// Grouping assignments by unit
// (a unit is derived from the assignment's linked lesson)
// =============================================================

/** A lesson's assignments within a unit (or the trailing "Unit Quiz" bucket). */
export type AssignmentLessonGroup<T> = {
  /** Stable key for React. */
  key: string;
  /** Lesson title, "Unit Quiz", or "" for the no-lesson bucket. */
  title: string;
  isUnitQuiz: boolean;
  assignments: T[];
};

export type AssignmentUnitGroup<T> = {
  /** Stable key for React. */
  key: string;
  /** Unit title, or "Other assignments" for the no-unit bucket. */
  unitTitle: string;
  lessonGroups: AssignmentLessonGroup<T>[];
};

/**
 * Group assignments by unit, then by lesson within each unit. The unit
 * comes from the assignment's linked lesson; lesson sub-groups follow the
 * lesson order in `units`. Assignments flagged `is_unit_quiz` are pulled
 * into a "Unit Quiz" sub-group at the end of their unit. Assignments with
 * no lesson land in a trailing "Other assignments" group.
 */
export function groupAssignmentsByUnit<
  T extends { lesson_id: string | null; is_unit_quiz: boolean },
>(
  assignments: T[],
  units: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string }>;
  }>
): AssignmentUnitGroup<T>[] {
  const lessonToUnit = new Map<string, string>();
  for (const u of units) {
    for (const l of u.lessons) lessonToUnit.set(l.id, u.id);
  }

  // Bucket every assignment under its unit (null = no unit).
  const byUnit = new Map<string | null, T[]>();
  for (const a of assignments) {
    const unitId = a.lesson_id ? lessonToUnit.get(a.lesson_id) ?? null : null;
    const list = byUnit.get(unitId);
    if (list) list.push(a);
    else byUnit.set(unitId, [a]);
  }

  const result: AssignmentUnitGroup<T>[] = [];

  for (const u of units) {
    const unitAssignments = byUnit.get(u.id);
    if (!unitAssignments || unitAssignments.length === 0) continue;

    const byLesson = new Map<string, T[]>();
    const quizzes: T[] = [];
    for (const a of unitAssignments) {
      if (a.is_unit_quiz) {
        quizzes.push(a);
      } else if (a.lesson_id) {
        const list = byLesson.get(a.lesson_id);
        if (list) list.push(a);
        else byLesson.set(a.lesson_id, [a]);
      }
    }

    const lessonGroups: AssignmentLessonGroup<T>[] = [];
    for (const l of u.lessons) {
      const list = byLesson.get(l.id);
      if (list && list.length > 0) {
        lessonGroups.push({
          key: l.id,
          title: l.title,
          isUnitQuiz: false,
          assignments: list,
        });
      }
    }
    if (quizzes.length > 0) {
      lessonGroups.push({
        key: `${u.id}:quiz`,
        title: "Unit Quiz",
        isUnitQuiz: true,
        assignments: quizzes,
      });
    }

    if (lessonGroups.length > 0) {
      result.push({ key: u.id, unitTitle: u.title, lessonGroups });
    }
  }

  const noUnit = byUnit.get(null);
  if (noUnit && noUnit.length > 0) {
    result.push({
      key: "__none__",
      unitTitle: "Other assignments",
      lessonGroups: [
        { key: "__none__", title: "", isUnitQuiz: false, assignments: noUnit },
      ],
    });
  }

  return result;
}
