import Link from "next/link";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import { letterGrade } from "@/lib/assignments";
import { DEMO_ASSIGNMENTS, DEMO_CLASS } from "@/lib/demo/fixtures";

export default function DemoStudentGrades() {
  const rows = DEMO_ASSIGNMENTS.filter((a) => a.published).map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    points: a.points,
    status: a.viewer.status,
    score: a.viewer.score,
    graded: a.viewer.status === "graded" && a.viewer.score !== null,
  }));

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
                    {rows.length} assignments graded
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
                    href={`/demo/student/assignments/${r.id}`}
                    className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-wood-900 truncate">
                          {r.title}
                        </p>
                        <AssignmentTypeBadge type={r.type} />
                      </div>
                      <p className="text-xs text-wood-500">{DEMO_CLASS.name}</p>
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
    </>
  );
}
