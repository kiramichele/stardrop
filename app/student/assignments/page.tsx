import Link from "next/link";
import { ClipboardList, ArrowRight, Clock } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import {
  computeLateness,
  groupAssignmentsByUnit,
  type AssignmentType,
} from "@/lib/assignments";
import { getAssignmentsForStudent } from "@/lib/assignments-server";
import { getUnitsForStudent } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AssignmentTypeBadge,
  SubmissionStatusBadge,
} from "@/components/assignments/Badges";

export default async function StudentAssignmentsPage() {
  const user = await requireStudent();
  const [assignments, units] = await Promise.all([
    getAssignmentsForStudent(user.id),
    getUnitsForStudent(user.id),
  ]);

  const lessonTitle = new Map<string, string>();
  for (const u of units) {
    for (const l of u.lessons) lessonTitle.set(l.id, l.title);
  }

  const groups = groupAssignmentsByUnit(assignments, units);

  return (
    <>
      <PageHeader
        eyebrow="Game Design"
        title="Assignments"
        description="Organized by unit, with due dates and status."
      />

      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Ms. Shinn hasn't posted any assignments yet. Check back soon!"
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
                    const sub = a.submission;
                    const grade =
                      sub && Array.isArray(sub.grades)
                        ? sub.grades[0]
                        : sub?.grades;
                    const { isLate, daysLate } = computeLateness(
                      sub?.submitted_at,
                      a.due_date
                    );
                    const dueText = a.due_date
                      ? new Date(a.due_date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "No due date";
                    const dueSoon =
                      a.due_date &&
                      !sub?.submitted_at &&
                      new Date(a.due_date).getTime() - Date.now() <
                        24 * 60 * 60 * 1000;
                    const lessonName = a.lesson_id
                      ? lessonTitle.get(a.lesson_id)
                      : null;

                    return (
                      <li key={a.id} className="p-1.5">
                        <Link
                          href={`/student/assignments/${a.id}`}
                          className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-wood-900 truncate">
                                {a.title}
                              </p>
                              <AssignmentTypeBadge
                                type={a.type as AssignmentType}
                              />
                            </div>
                            <p className="text-xs text-wood-500 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span
                                className={
                                  dueSoon
                                    ? "text-terracotta-700 font-medium"
                                    : ""
                                }
                              >
                                {dueText}
                                {dueSoon && " · due soon"}
                              </span>
                              <span>· {a.points} pts</span>
                              {lessonName && <span>· {lessonName}</span>}
                              {isLate && grade && (
                                <span className="text-terracotta-700">
                                  · submitted {daysLate}d late
                                </span>
                              )}
                            </p>
                          </div>
                          {grade && (
                            <div className="text-right">
                              <p className="font-display text-lg text-sage-700">
                                {grade.score}
                                <span className="text-wood-400 text-sm font-normal">
                                  /{a.points}
                                </span>
                              </p>
                            </div>
                          )}
                          <SubmissionStatusBadge
                            status={sub?.status}
                            hasGrade={!!grade}
                            isLate={isLate}
                          />
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
