import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignmentReady } from "@/lib/assignments";
import { getAllExcusals } from "@/lib/excusals-server";

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

  const [
    studentsRes,
    enrollmentsRes,
    assignmentsRes,
    submissionsRes,
    excusals,
  ] = await Promise.all([
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
    getAllExcusals(),
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
      // Excused work doesn't count for or against the student.
      if (excusals.has(`${stu.id}::${a.id}`)) continue;
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

// =============================================================
// Unit x class heat map (completion + average score)
// =============================================================

export type HeatmapCell = {
  completionPct: number | null;
  avgPct: number | null;
  assignmentCount: number;
};

export type UnitClassHeatmap = {
  units: { id: string; title: string }[];
  classes: { id: string; label: string }[];
  /** cells[unitId][classId] */
  cells: Record<string, Record<string, HeatmapCell>>;
};

export async function getUnitClassHeatmap(): Promise<UnitClassHeatmap> {
  const admin = createAdminClient();

  const [
    unitsRes,
    lessonsRes,
    classesRes,
    assignmentsRes,
    enrollmentsRes,
    submissionsRes,
    excusals,
  ] = await Promise.all([
    admin.from("units").select("id, title, order").order("order"),
    admin.from("lessons").select("id, unit_id"),
    admin
      .from("classes")
      .select("id, name, period_number")
      .order("period_number", { ascending: true, nullsFirst: false }),
    admin
      .from("assignments")
      .select("id, class_id, lesson_id, points, type, interactive_html_url")
      .eq("published", true),
    admin.from("enrollments").select("class_id, user_id"),
    admin
      .from("submissions")
      .select("assignment_id, user_id, status, grades(score)"),
    getAllExcusals(),
  ]);

  const lessonToUnit = new Map<string, string>();
  for (const l of lessonsRes.data ?? []) lessonToUnit.set(l.id, l.unit_id);

  const ready = (assignmentsRes.data ?? []).filter(isAssignmentReady);

  const studentsByClass = new Map<string, string[]>();
  for (const e of enrollmentsRes.data ?? []) {
    const arr = studentsByClass.get(e.class_id) ?? [];
    arr.push(e.user_id);
    studentsByClass.set(e.class_id, arr);
  }

  const pair = (u: string, a: string) => `${u}::${a}`;
  const subs = new Map<string, { status: string; score: number | null }>();
  for (const s of submissionsRes.data ?? []) {
    const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
    subs.set(pair(s.user_id, s.assignment_id), {
      status: s.status,
      score: grade?.score ?? null,
    });
  }

  // assignments grouped: unit -> class -> assignments
  const byUnitClass = new Map<string, Map<string, typeof ready>>();
  for (const a of ready) {
    if (!a.lesson_id) continue;
    const unitId = lessonToUnit.get(a.lesson_id);
    if (!unitId) continue;
    let cm = byUnitClass.get(unitId);
    if (!cm) {
      cm = new Map();
      byUnitClass.set(unitId, cm);
    }
    const arr = cm.get(a.class_id) ?? [];
    arr.push(a);
    cm.set(a.class_id, arr);
  }

  const units = (unitsRes.data ?? [])
    .filter((u) => byUnitClass.has(u.id))
    .map((u) => ({ id: u.id, title: u.title }));
  const classes = (classesRes.data ?? []).map((c) => ({
    id: c.id,
    label: c.period_number != null ? `P${c.period_number}` : c.name,
  }));

  const cells: Record<string, Record<string, HeatmapCell>> = {};
  for (const u of units) {
    cells[u.id] = {};
    const cm = byUnitClass.get(u.id);
    for (const c of classes) {
      const assignments = cm?.get(c.id) ?? [];
      if (assignments.length === 0) {
        cells[u.id][c.id] = {
          completionPct: null,
          avgPct: null,
          assignmentCount: 0,
        };
        continue;
      }
      const students = studentsByClass.get(c.id) ?? [];
      let expected = 0;
      let completed = 0;
      let sumScore = 0;
      let sumPoints = 0;
      for (const a of assignments) {
        for (const studentId of students) {
          if (excusals.has(pair(studentId, a.id))) continue;
          expected++;
          const sub = subs.get(pair(studentId, a.id));
          if (
            sub &&
            (sub.status === "submitted" || sub.status === "graded")
          ) {
            completed++;
          }
          if (sub && sub.score !== null) {
            sumScore += sub.score;
            sumPoints += a.points;
          }
        }
      }
      cells[u.id][c.id] = {
        completionPct: expected > 0 ? (completed / expected) * 100 : null,
        avgPct: sumPoints > 0 ? (sumScore / sumPoints) * 100 : null,
        assignmentCount: assignments.length,
      };
    }
  }

  return { units, classes, cells };
}
