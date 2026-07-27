import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { groupAssignmentsByUnit } from "@/lib/assignments";
import { getAssignmentsForTeacher } from "@/lib/assignments-server";
import { getUnitsForTeacher } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TeacherAssignmentBoard,
  type BoardGroup,
  type BoardAssignment,
} from "@/components/assignments/TeacherAssignmentBoard";

export default async function TeacherAssignmentsPage() {
  const [assignments, units] = await Promise.all([
    getAssignmentsForTeacher(),
    getUnitsForTeacher(),
  ]);

  // Collapse the per-class copies of one assignment into a single board row.
  // Copies created together share an assignment_group_id; older copies (no id
  // yet) fall back to grouping by title/type/lesson so they still collapse.
  function collapseCopies(rows: typeof assignments): BoardAssignment[] {
    const map = new Map<string, BoardAssignment>();
    for (const a of rows) {
      const klass = Array.isArray(a.classes) ? a.classes[0] : a.classes;
      const subCount =
        Array.isArray(a.submissions) && a.submissions[0]
          ? a.submissions[0].count
          : 0;
      const key =
        a.assignment_group_id ??
        `t:${a.title}|${a.type}|${a.lesson_id ?? ""}|${a.is_unit_quiz}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          title: a.title,
          type: a.type,
          dueDate: a.due_date,
          points: a.points,
          ids: [],
          primaryId: a.id,
          classes: [],
          submissionCount: 0,
          publishedCount: 0,
        };
        map.set(key, entry);
      }
      entry.ids.push(a.id);
      entry.classes.push({
        id: a.id,
        className: klass?.name ?? "Unknown class",
        periodNumber: klass?.period_number ?? null,
        published: a.published,
        submissionCount: subCount,
      });
      entry.submissionCount += subCount;
      if (a.published) entry.publishedCount += 1;
    }
    const result = [...map.values()];
    for (const e of result) {
      e.classes.sort((x, y) => {
        const px = x.periodNumber ?? 99;
        const py = y.periodNumber ?? 99;
        return px !== py ? px - py : x.className.localeCompare(y.className);
      });
    }
    return result;
  }

  const groups = groupAssignmentsByUnit(assignments, units);
  const boardGroups: BoardGroup[] = groups.map((g) => ({
    key: g.key,
    unitTitle: g.unitTitle,
    lessonGroups: g.lessonGroups.map((lg) => ({
      key: lg.key,
      title: lg.title,
      isUnitQuiz: lg.isUnitQuiz,
      assignments: collapseCopies(lg.assignments),
    })),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Assignments"
        description="Organized by unit. Select assignments to publish or unpublish in bulk."
        action={
          <Link href="/teacher/assignments/new">
            <Button>
              <Plus className="w-4 h-4" strokeWidth={2} />
              New assignment
            </Button>
          </Link>
        }
      />

      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Create your first assignment. Code assignments use the Monaco editor with Unity autocomplete."
            action={
              <Link href="/teacher/assignments/new">
                <Button>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create your first assignment
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <TeacherAssignmentBoard groups={boardGroups} />
      )}
    </>
  );
}
