import Link from "next/link";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { type AssignmentType, groupAssignmentsByUnit } from "@/lib/assignments";
import { getAssignmentsForTeacher } from "@/lib/assignments-server";
import { getUnitsForTeacher } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AssignmentTypeBadge,
  PublishBadge,
} from "@/components/assignments/Badges";

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

  return (
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Assignments"
        description="Organized by unit, across all sections. Create, edit, and grade work."
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
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="font-display text-xl text-wood-800 mb-3">
                {g.unitTitle}
              </h2>
              <Card padded={false} className="overflow-hidden">
                <ul className="divide-y divide-wood-100">
                  {g.assignments.map((a) => {
                    const klass = Array.isArray(a.classes)
                      ? a.classes[0]
                      : a.classes;
                    const subCount =
                      Array.isArray(a.submissions) && a.submissions[0]
                        ? a.submissions[0].count
                        : 0;
                    const lessonName = a.lesson_id
                      ? lessonTitle.get(a.lesson_id)
                      : null;
                    return (
                      <li key={a.id} className="p-1.5">
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          className="group flex items-center gap-4 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-medium text-wood-900 truncate">
                                {a.title}
                              </p>
                              <AssignmentTypeBadge
                                type={a.type as AssignmentType}
                              />
                              <PublishBadge published={a.published} />
                            </div>
                            <p className="text-xs text-wood-500">
                              {klass?.name ?? "Unknown class"}
                              {lessonName && ` · ${lessonName}`}
                              {a.due_date &&
                                ` · due ${new Date(
                                  a.due_date
                                ).toLocaleDateString()}`}
                              {a.points && ` · ${a.points} pts`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-display text-xl text-terracotta-700">
                              {subCount}
                            </p>
                            <p className="text-[0.65rem] uppercase tracking-wide-label text-wood-500 font-semibold">
                              {subCount === 1 ? "submission" : "submissions"}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
