import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignmentReady } from "@/lib/assignments";

// Teacher analytics. Admin-client based — the calling page is
// requireTeacher()-gated.

// =============================================================
// Lesson completions
// =============================================================

export type LessonCompletionStat = {
  lessonId: string;
  lessonTitle: string;
  unitTitle: string | null;
  completions: number;
};

export async function getLessonCompletionStats(): Promise<{
  lessons: LessonCompletionStat[];
  totalStudents: number;
}> {
  const admin = createAdminClient();
  const [lessonsRes, unitsRes, completionsRes, studentsRes] =
    await Promise.all([
      admin.from("lessons").select("id, title, unit_id").eq("published", true),
      admin.from("units").select("id, title"),
      admin.from("lesson_completions").select("lesson_id"),
      admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
    ]);

  const unitTitle = new Map<string, string>();
  for (const u of unitsRes.data ?? []) unitTitle.set(u.id, u.title);

  const countByLesson = new Map<string, number>();
  for (const c of completionsRes.data ?? []) {
    countByLesson.set(
      c.lesson_id,
      (countByLesson.get(c.lesson_id) ?? 0) + 1
    );
  }

  const lessons: LessonCompletionStat[] = (lessonsRes.data ?? [])
    .map((l) => ({
      lessonId: l.id,
      lessonTitle: l.title,
      unitTitle: unitTitle.get(l.unit_id) ?? null,
      completions: countByLesson.get(l.id) ?? 0,
    }))
    .sort((a, b) => b.completions - a.completions);

  return { lessons, totalStudents: studentsRes.count ?? 0 };
}

// =============================================================
// Struggling students
// =============================================================

export type StrugglingStudent = {
  id: string;
  name: string;
  averagePct: number | null;
  gradedCount: number;
  missingCount: number;
  /** Higher = more concern. Drives the ranking. */
  struggleScore: number;
};

export async function getStrugglingStudents(): Promise<StrugglingStudent[]> {
  const admin = createAdminClient();
  const now = Date.now();

  const [studentsRes, enrollmentsRes, assignmentsRes, submissionsRes] =
    await Promise.all([
      admin
        .from("users")
        .select("id, first_name, last_name")
        .eq("role", "student"),
      admin.from("enrollments").select("user_id, class_id"),
      admin
        .from("assignments")
        .select("id, class_id, points, due_date, type, interactive_html_url")
        .eq("published", true),
      admin
        .from("submissions")
        .select("user_id, assignment_id, status, grades(score)"),
    ]);

  const readyAssignments = (assignmentsRes.data ?? []).filter(
    isAssignmentReady
  );
  const assignmentsByClass = new Map<string, typeof readyAssignments>();
  for (const a of readyAssignments) {
    const arr = assignmentsByClass.get(a.class_id) ?? [];
    arr.push(a);
    assignmentsByClass.set(a.class_id, arr);
  }

  const classesByStudent = new Map<string, string[]>();
  for (const e of enrollmentsRes.data ?? []) {
    const arr = classesByStudent.get(e.user_id) ?? [];
    arr.push(e.class_id);
    classesByStudent.set(e.user_id, arr);
  }

  const subKey = (u: string, a: string) => `${u}::${a}`;
  const subByUserAssignment = new Map<
    string,
    { status: string; score: number | null }
  >();
  for (const s of submissionsRes.data ?? []) {
    const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
    subByUserAssignment.set(subKey(s.user_id, s.assignment_id), {
      status: s.status,
      score: grade?.score ?? null,
    });
  }

  const result: StrugglingStudent[] = [];
  for (const stu of studentsRes.data ?? []) {
    const classIds = classesByStudent.get(stu.id) ?? [];
    const applicable = classIds.flatMap(
      (cid) => assignmentsByClass.get(cid) ?? []
    );

    let earned = 0;
    let possible = 0;
    let gradedCount = 0;
    let missingCount = 0;
    for (const a of applicable) {
      const sub = subByUserAssignment.get(subKey(stu.id, a.id));
      if (sub && sub.score !== null) {
        earned += sub.score;
        possible += a.points;
        gradedCount++;
      }
      const due = a.due_date ? new Date(a.due_date).getTime() : null;
      const submitted =
        sub && (sub.status === "submitted" || sub.status === "graded");
      if (due !== null && due < now && !submitted) missingCount++;
    }

    const averagePct = possible > 0 ? (earned / possible) * 100 : null;
    const gradeGap = averagePct === null ? 0 : Math.max(0, 80 - averagePct);
    const struggleScore = missingCount * 12 + gradeGap;

    result.push({
      id: stu.id,
      name: `${stu.first_name} ${stu.last_name}`.trim() || "Unknown",
      averagePct,
      gradedCount,
      missingCount,
      struggleScore,
    });
  }

  result.sort((a, b) => b.struggleScore - a.struggleScore);
  return result;
}

// =============================================================
// Time on task (from activity pings — see ActivityTracker)
// =============================================================

export type TimeOnTaskStat = {
  assignmentId: string;
  assignmentTitle: string;
  avgMinutes: number;
  sampleSize: number;
};

export async function getTimeOnTaskStats(): Promise<TimeOnTaskStat[]> {
  const admin = createAdminClient();

  const [assignmentsRes, submissionsRes, eventsRes] = await Promise.all([
    admin.from("assignments").select("id, title"),
    admin.from("submissions").select("id, assignment_id"),
    admin
      .from("submission_events")
      .select("submission_id, payload")
      .eq("event_type", "keystroke_batch"),
  ]);

  const msBySubmission = new Map<string, number>();
  for (const e of eventsRes.data ?? []) {
    const payload = e.payload as { activeMs?: number } | null;
    const ms =
      payload && typeof payload.activeMs === "number"
        ? payload.activeMs
        : 60000;
    msBySubmission.set(
      e.submission_id,
      (msBySubmission.get(e.submission_id) ?? 0) + ms
    );
  }

  const assignmentTitle = new Map<string, string>();
  for (const a of assignmentsRes.data ?? []) {
    assignmentTitle.set(a.id, a.title);
  }

  const minutesByAssignment = new Map<string, number[]>();
  for (const s of submissionsRes.data ?? []) {
    const ms = msBySubmission.get(s.id);
    if (ms === undefined) continue;
    const arr = minutesByAssignment.get(s.assignment_id) ?? [];
    arr.push(ms / 60000);
    minutesByAssignment.set(s.assignment_id, arr);
  }

  const stats: TimeOnTaskStat[] = [];
  for (const [assignmentId, mins] of minutesByAssignment) {
    const avg = mins.reduce((sum, m) => sum + m, 0) / mins.length;
    stats.push({
      assignmentId,
      assignmentTitle: assignmentTitle.get(assignmentId) ?? "Assignment",
      avgMinutes: avg,
      sampleSize: mins.length,
    });
  }
  stats.sort((a, b) => b.avgMinutes - a.avgMinutes);
  return stats;
}
