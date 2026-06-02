import Link from "next/link";
import {
  BookOpen,
  TriangleAlert,
  Timer,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  DEMO_STUDENTS,
  DEMO_UNITS,
  DEMO_TIME_ON_TASK,
  DEMO_HEATMAP_UNITS,
} from "@/lib/demo/fixtures";

function heatColor(pct: number): string {
  if (pct === 0) return "bg-wood-100 text-wood-400";
  if (pct >= 90) return "bg-sage-500 text-white";
  if (pct >= 80) return "bg-sage-300 text-sage-900";
  if (pct >= 70) return "bg-honey-300 text-honey-900";
  return "bg-terracotta-300 text-terracotta-900";
}

export default function DemoAnalyticsPage() {
  const totalStudents = DEMO_STUDENTS.length;

  // Lesson completion counts derived from each student's lessonsCompleted.
  const lessonRows = DEMO_UNITS.flatMap((u, ui) =>
    u.lessons.map((l, li) => {
      const globalIndex =
        DEMO_UNITS.slice(0, ui).reduce((n, x) => n + x.lessons.length, 0) + li;
      const completions = DEMO_STUDENTS.filter(
        (s) => s.lessonsCompleted > globalIndex
      ).length;
      return { ...l, unitTitle: u.title, completions };
    })
  );

  const flagged = DEMO_STUDENTS.filter(
    (s) => s.averagePct === null || s.averagePct < 80 || s.missingCount >= 2
  );

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Analytics"
        description="Lesson completions, students who may need a hand, time-on-task, and scores by unit."
      />

      <div className="space-y-7">
        {/* Scores by unit — heat map */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-terracotta-600" strokeWidth={2} />
            <h2 className="font-display text-xl text-wood-800">
              Scores by unit
            </h2>
          </div>
          <Card>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DEMO_HEATMAP_UNITS.map((u) => (
                <div key={u.unit} className="text-center">
                  <div
                    className={[
                      "rounded-cozy py-5 font-display text-2xl",
                      heatColor(u.pct),
                    ].join(" ")}
                  >
                    {u.pct === 0 ? "—" : `${u.pct}%`}
                  </div>
                  <p className="text-xs text-wood-600 mt-1.5 leading-tight">
                    {u.unit}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Lesson completions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-sage-600" strokeWidth={2} />
            <h2 className="font-display text-xl text-wood-800">
              Lesson completions
            </h2>
          </div>
          <Card>
            <div className="space-y-2.5">
              {lessonRows.map((l) => {
                const pct = Math.min(100, (l.completions / totalStudents) * 100);
                return (
                  <div key={l.id}>
                    <div className="flex items-baseline justify-between gap-3 mb-0.5">
                      <p className="text-sm text-wood-800 truncate">
                        <span className="text-wood-400">{l.unitTitle} · </span>
                        {l.title}
                      </p>
                      <p className="text-xs text-wood-500 flex-shrink-0 tabular-nums">
                        {l.completions} / {totalStudents}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-wood-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Struggling students */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TriangleAlert
              className="w-4 h-4 text-terracotta-600"
              strokeWidth={2}
            />
            <h2 className="font-display text-xl text-wood-800">
              Students who may need a hand
            </h2>
          </div>
          <Card padded={false} className="overflow-hidden">
            {flagged.length === 0 ? (
              <p className="text-sm text-wood-500 italic p-6 text-center">
                Nobody flagged right now — grades and missing work look healthy.
              </p>
            ) : (
              <ul className="divide-y divide-wood-100">
                {flagged.map((s) => (
                  <li key={s.id} className="p-1.5">
                    <Link
                      href={`/demo/teacher/students/${s.id}`}
                      className="group flex items-center gap-4 px-3 py-2.5 rounded-cozy hover:bg-cream-200 transition-colors"
                    >
                      <p className="flex-1 min-w-0 font-medium text-wood-900 truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-wood-500 flex-shrink-0">
                        {s.averagePct === null
                          ? "no grades yet"
                          : `${s.averagePct}% avg`}
                      </p>
                      {s.missingCount > 0 && (
                        <span className="flex-shrink-0 text-[0.65rem] font-semibold text-terracotta-800 bg-terracotta-100 border border-terracotta-200 rounded px-1.5 py-0.5">
                          {s.missingCount} missing
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Time on task */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-honey-600" strokeWidth={2} />
            <h2 className="font-display text-xl text-wood-800">Time on task</h2>
          </div>
          <Card>
            <div className="space-y-2">
              {DEMO_TIME_ON_TASK.map((t) => (
                <div
                  key={t.assignmentId}
                  className="flex items-baseline justify-between gap-3"
                >
                  <p className="text-sm text-wood-800 truncate">
                    {t.assignmentTitle}
                  </p>
                  <p className="text-xs text-wood-500 flex-shrink-0 tabular-nums">
                    <span className="font-display text-base text-wood-800">
                      {t.avgMinutes}
                    </span>{" "}
                    min avg · {t.sampleSize} students
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
