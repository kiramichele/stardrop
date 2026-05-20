import Link from "next/link";
import { Award, ClipboardList } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getAssignmentsForStudent } from "@/lib/assignments-server";
import { type AssignmentType } from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";

// Standard US scale. If the class uses a different cutoff, this is the
// one spot to change it.
function letterGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export default async function StudentGradesPage() {
  const user = await requireStudent();
  const assignments = await getAssignmentsForStudent(user.id);

  const rows = assignments.map((a) => {
    const sub = a.submission;
    const grade =
      sub && Array.isArray(sub.grades) ? sub.grades[0] : sub?.grades ?? null;
    const score = grade?.score ?? null;
    const klass = Array.isArray(a.classes) ? a.classes[0] : a.classes;
    return {
      id: a.id,
      title: a.title,
      type: a.type as AssignmentType,
      points: a.points,
      className: klass?.name ?? null,
      status: sub?.status ?? null,
      score,
      graded: score !== null,
    };
  });

  const graded = rows.filter((r) => r.graded);
  const earned = graded.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const possible = graded.reduce((sum, r) => sum + r.points, 0);
  const averagePct = possible > 0 ? (earned / possible) * 100 : null;

  return (
    <>
      <PageHeader
        eyebrow="Your progress"
        title="Grades"
        description="Your scores on graded assignments and your running average."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Once your teacher publishes assignments, your grades will show up here."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-sage-50 border-sage-200">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-8 h-8 text-sage-700" strokeWidth={1.75} />
              </div>
              <div>
                <p className="label-eyebrow text-sage-700">Overall average</p>
                {averagePct === null ? (
                  <p className="font-display text-2xl text-wood-700 mt-1">
                    No grades yet
                  </p>
                ) : (
                  <>
                    <p className="font-display text-4xl text-sage-800 mt-0.5 leading-none">
                      {averagePct.toFixed(1)}%
                      <span className="text-2xl text-sage-600 ml-2">
                        {letterGrade(averagePct)}
                      </span>
                    </p>
                    <p className="text-sm text-wood-600 mt-1.5">
                      {earned} / {possible} points · {graded.length} of{" "}
                      {rows.length}{" "}
                      {rows.length === 1 ? "assignment" : "assignments"} graded
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-wood-100">
              {rows.map((r) => {
                const pct =
                  r.graded && r.points > 0
                    ? ((r.score ?? 0) / r.points) * 100
                    : null;
                return (
                  <li key={r.id} className="p-1.5">
                    <Link
                      href={`/student/assignments/${r.id}`}
                      className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-wood-900 truncate">
                            {r.title}
                          </p>
                          <AssignmentTypeBadge type={r.type} />
                        </div>
                        {r.className && (
                          <p className="text-xs text-wood-500">
                            {r.className}
                          </p>
                        )}
                      </div>
                      {r.graded ? (
                        <div className="text-right flex-shrink-0">
                          <p className="font-display text-lg text-sage-700">
                            {r.score}
                            <span className="text-wood-400 text-sm font-normal">
                              /{r.points}
                            </span>
                          </p>
                          {pct !== null && (
                            <p className="text-xs text-wood-500">
                              {pct.toFixed(0)}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-wood-500 flex-shrink-0">
                          {r.status === "submitted"
                            ? "Submitted — not graded"
                            : r.status === "draft"
                              ? "In progress"
                              : "Not started"}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
