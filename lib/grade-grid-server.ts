import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignmentReady } from "@/lib/assignments";
import { getAllExcusals } from "@/lib/excusals-server";

// The interactive, editable spreadsheet-style gradebook at
// /teacher/gradebook — NOT the Canvas CSV import/export tool in
// lib/gradebook.ts / lib/gradebook-server.ts. Different feature, similar
// name; this one is admin-client based (requireFullTeacher()-gated).

export type GradeGridStudent = {
  id: string;
  firstName: string;
  lastName: string;
};

export type GradeGridAssignment = {
  id: string;
  title: string;
  points: number;
  dueDate: string | null;
  isPractice: boolean;
};

export type GradeGridCell = {
  submissionId: string | null;
  score: number | null;
  /** grades.feedback — same field students see on their assignment page. */
  note: string | null;
  status: "draft" | "submitted" | "graded" | null;
  excused: boolean;
};

export type GradeGridData = {
  students: GradeGridStudent[];
  assignments: GradeGridAssignment[];
  /** cells[studentId][assignmentId] */
  cells: Record<string, Record<string, GradeGridCell>>;
};

export async function getGradeGrid(classId: string): Promise<GradeGridData> {
  const admin = createAdminClient();

  const [enrollRes, assignmentsRes, excusals] = await Promise.all([
    admin.from("enrollments").select("user_id").eq("class_id", classId),
    admin
      .from("assignments")
      .select(
        "id, title, points, due_date, due_date_1_5x, due_date_2x, interactive_html_url, type, is_practice"
      )
      .eq("class_id", classId)
      .eq("published", true),
    getAllExcusals(),
  ]);

  const studentIds = (enrollRes.data ?? []).map((e) => e.user_id);
  const readyAssignments = (assignmentsRes.data ?? []).filter(isAssignmentReady);
  const assignmentIds = readyAssignments.map((a) => a.id);

  const [studentsRes, submissionsRes] = await Promise.all([
    studentIds.length > 0
      ? admin
          .from("users")
          .select("id, first_name, last_name")
          .in("id", studentIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length > 0
      ? admin
          .from("submissions")
          .select("id, user_id, assignment_id, status, grades(score, feedback)")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const students: GradeGridStudent[] = (studentsRes.data ?? [])
    .map((s) => ({ id: s.id, firstName: s.first_name, lastName: s.last_name }))
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName)
    );

  const assignments: GradeGridAssignment[] = readyAssignments
    .map((a) => ({
      id: a.id,
      title: a.title,
      points: a.points,
      dueDate: a.due_date,
      isPractice: a.is_practice,
    }))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const cells: Record<string, Record<string, GradeGridCell>> = {};
  for (const s of students) cells[s.id] = {};

  for (const sub of submissionsRes.data ?? []) {
    if (!cells[sub.user_id]) continue; // stale enrollment guard
    const grade = Array.isArray(sub.grades) ? sub.grades[0] : sub.grades;
    cells[sub.user_id][sub.assignment_id] = {
      submissionId: sub.id,
      score: grade?.score ?? null,
      note: grade?.feedback ?? null,
      status: sub.status,
      excused: excusals.has(`${sub.user_id}::${sub.assignment_id}`),
    };
  }
  // Fill in excusal-only cells (no submission, but marked excused).
  for (const s of students) {
    for (const a of assignments) {
      if (cells[s.id][a.id]) continue;
      if (excusals.has(`${s.id}::${a.id}`)) {
        cells[s.id][a.id] = {
          submissionId: null,
          score: null,
          note: null,
          status: null,
          excused: true,
        };
      }
    }
  }

  return { students, assignments, cells };
}

/** Find or create the submission row a grade/note attaches to. */
async function ensureSubmissionRow(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  assignmentId: string
): Promise<string | null> {
  const { data: existing } = await admin
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", studentId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await admin
    .from("submissions")
    .insert({ assignment_id: assignmentId, user_id: studentId, status: "graded" })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id;
}

export type GradeGridMutationResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

/**
 * Set (or clear, with score = null) one cell's score. Clearing deletes the
 * grades row entirely — since score is required whenever a grade exists,
 * there's no way to keep a note without a score attached.
 */
export async function setGradeGridScore(
  studentId: string,
  assignmentId: string,
  score: number | null
): Promise<GradeGridMutationResult> {
  const admin = createAdminClient();
  const submissionId = await ensureSubmissionRow(admin, studentId, assignmentId);
  if (!submissionId) {
    return { ok: false, error: "Couldn't set up a submission for that cell." };
  }

  if (score === null) {
    await admin.from("grades").delete().eq("submission_id", submissionId);
    return { ok: true, submissionId };
  }

  const { error } = await admin.from("grades").upsert(
    { submission_id: submissionId, score, graded_at: new Date().toISOString() },
    { onConflict: "submission_id" }
  );
  if (error) return { ok: false, error: error.message };
  await admin
    .from("submissions")
    .update({ status: "graded" })
    .eq("id", submissionId);
  return { ok: true, submissionId };
}

/**
 * Set (or clear) a cell's note — this is grades.feedback, the exact same
 * field the student sees on their assignment page. Not a private note.
 * If no grade exists yet, one is created with a 0 score (grades.score is
 * required) — the teacher can edit the score afterward.
 */
export async function setGradeGridNote(
  studentId: string,
  assignmentId: string,
  note: string
): Promise<GradeGridMutationResult> {
  const admin = createAdminClient();
  const submissionId = await ensureSubmissionRow(admin, studentId, assignmentId);
  if (!submissionId) {
    return { ok: false, error: "Couldn't set up a submission for that cell." };
  }

  const { data: existing } = await admin
    .from("grades")
    .select("score")
    .eq("submission_id", submissionId)
    .maybeSingle();

  const { error } = await admin.from("grades").upsert(
    {
      submission_id: submissionId,
      score: existing?.score ?? 0,
      feedback: note.trim() || null,
      graded_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" }
  );
  if (error) return { ok: false, error: error.message };
  await admin
    .from("submissions")
    .update({ status: "graded" })
    .eq("id", submissionId);
  return { ok: true, submissionId };
}
