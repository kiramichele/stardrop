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
} from "@/components/assignments/TeacherAssignmentBoard";

export default async function TeacherAssignmentsPage() {
  const [assignments, units] = await Promise.all([
    getAssignmentsForTeacher(),
    getUnitsForTeacher(),
  ]);

  const lessonTitle = new Map<string, string>();
  for (const u of units) {
    for (const l of u.lessons) lessonTitle.set(l.id, l.title);
  }

  const groups = groupAssignmentsByUnit(assignments, units);
  const boardGroups: BoardGroup[] = groups.map((g) => ({
    key: g.key,
    unitTitle: g.unitTitle,
    assignments: g.assignments.map((a) => {
      const klass = Array.isArray(a.classes) ? a.classes[0] : a.classes;
      const subCount =
        Array.isArray(a.submissions) && a.submissions[0]
          ? a.submissions[0].count
          : 0;
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        published: a.published,
        dueDate: a.due_date,
        points: a.points,
        className: klass?.name ?? "Unknown class",
        lessonName: a.lesson_id ? lessonTitle.get(a.lesson_id) ?? null : null,
        submissionCount: subCount,
      };
    }),
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
