import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile, type UserProfile } from "@/lib/profile";
import { isAssignmentReady } from "@/lib/assignments";
import { getExcusalsForStudent } from "@/lib/excusals-server";

// Teacher-facing: everything about one student in a single view.
// Uses the admin client (the calling page is requireTeacher()-gated).

export type StudentGradeRow = {
  assignmentId: string;
  title: string;
  type: string;
  points: number;
  dueDate: string | null;
  status: "draft" | "submitted" | "graded" | null;
  submissionId: string | null;
  score: number | null;
  excused: boolean;
};

export type StudentOverview = {
  student: UserProfile;
  classes: { id: string; name: string; periodNumber: number | null }[];
  grades: StudentGradeRow[];
  lessonsCompleted: number;
  lessonsTotal: number;
  discussionPosts: number;
};

export async function getStudentOverview(
  studentId: string
): Promise<StudentOverview | null> {
  const admin = createAdminClient();

  const { data: userRow } = await admin
    .from("users")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();
  if (!userRow) return null;
  const student = asProfile(userRow);

  // Enrolled classes
  const { data: enrollmentRows } = await admin
    .from("enrollments")
    .select("class_id, classes(id, name, period_number)")
    .eq("user_id", studentId);
  const classes = (enrollmentRows ?? [])
    .map((e) => {
      const c = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return c
        ? { id: c.id, name: c.name, periodNumber: c.period_number }
        : null;
    })
    .filter(
      (c): c is { id: string; name: string; periodNumber: number | null } =>
        c !== null
    );
  const classIds = classes.map((c) => c.id);

  // Published assignments in the student's class(es)
  let assignments: Array<{
    id: string;
    title: string;
    type: string;
    points: number;
    due_date: string | null;
    interactive_html_url: string | null;
  }> = [];
  if (classIds.length > 0) {
    const { data } = await admin
      .from("assignments")
      .select("id, title, type, points, due_date, interactive_html_url")
      .in("class_id", classIds)
      .eq("published", true)
      .order("due_date", { ascending: true, nullsFirst: false });
    assignments = (data ?? []).filter(isAssignmentReady);
  }

  // The student's submissions + grades
  const { data: submissionRows } = await admin
    .from("submissions")
    .select("id, assignment_id, status, grades(score)")
    .eq("user_id", studentId);
  const subByAssignment = new Map(
    (submissionRows ?? []).map((s) => [s.assignment_id, s])
  );

  const excusals = await getExcusalsForStudent(studentId);

  const grades: StudentGradeRow[] = assignments.map((a) => {
    const sub = subByAssignment.get(a.id);
    const grade = sub
      ? Array.isArray(sub.grades)
        ? sub.grades[0]
        : sub.grades
      : null;
    return {
      assignmentId: a.id,
      title: a.title,
      type: a.type,
      points: a.points,
      dueDate: a.due_date,
      status: sub?.status ?? null,
      submissionId: sub?.id ?? null,
      score: grade?.score ?? null,
      excused: excusals.has(a.id),
    };
  });

  const [lessonsTotalRes, lessonsDoneRes, postsRes] = await Promise.all([
    admin
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("published", true),
    admin
      .from("lesson_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", studentId),
    admin
      .from("discussion_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", studentId)
      .is("deleted_at", null),
  ]);

  return {
    student,
    classes,
    grades,
    lessonsCompleted: lessonsDoneRes.count ?? 0,
    lessonsTotal: lessonsTotalRes.count ?? 0,
    discussionPosts: postsRes.count ?? 0,
  };
}

// =============================================================
// Pinned reminders ("sticky notes") on a student
// =============================================================

export type StudentNote = {
  id: string;
  body: string;
  createdAt: string;
};

/** A student's pinned reminders, newest first. */
export async function getStudentNotes(
  studentId: string
): Promise<StudentNote[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("student_notes")
    .select("id, body, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.created_at,
  }));
}
