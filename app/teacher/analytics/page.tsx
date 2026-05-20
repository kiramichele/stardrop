import Link from "next/link";
import {
  BookOpen,
  TriangleAlert,
  Timer,
  ArrowRight,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLessonCompletionStats,
  getStrugglingStudents,
  getTimeOnTaskStats,
} from "@/lib/analytics-server";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AiAnalysisPanel } from "@/components/analytics/AiAnalysisPanel";

export default async function AnalyticsPage() {
  await requireTeacher();
  const admin = createAdminClient();

  const [completion, struggling, timeOnTask, assignmentsRes] =
    await Promise.all([
      getLessonCompletionStats(),
      getStrugglingStudents(),
      getTimeOnTaskStats(),
      admin
        .from("assignments")
        .select("id, title")
        .order("created_at", { ascending: false }),
    ]);

  const apiConfigured = isAnthropicConfigured();

  const assignmentOptions = (assignmentsRes.data ?? []).map((a) => ({
    id: a.id,
    label: a.title,
  }));
  const studentOptions = [...struggling]
    .map((s) => ({ id: s.id, label: s.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const flagged = struggling.filter((s) => s.struggleScore > 0).slice(0, 12);

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Analytics"
        description="Lesson completions, students who may need a hand, time-on-task, and AI insight into what's tripping students up."
      />

      <div className="space-y-7">
        {/* Lesson completions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-sage-600" strokeWidth={2} />
            <h2 className="font-display text-xl text-wood-800">
              Lesson completions
            </h2>
          </div>
          <Card>
            {completion.lessons.length === 0 ? (
              <p className="text-sm text-wood-500 italic">
                No published lessons yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {completion.lessons.map((l) => {
                  const pct =
                    completion.totalStudents > 0
                      ? Math.min(
                          100,
                          (l.completions / completion.totalStudents) * 100
                        )
                      : 0;
                  return (
                    <div key={l.lessonId}>
                      <div className="flex items-baseline justify-between gap-3 mb-0.5">
                        <p className="text-sm text-wood-800 truncate">
                          {l.unitTitle && (
                            <span className="text-wood-400">
                              {l.unitTitle} ·{" "}
                            </span>
                          )}
                          {l.lessonTitle}
                        </p>
                        <p className="text-xs text-wood-500 flex-shrink-0 tabular-nums">
                          {l.completions}
                          {completion.totalStudents > 0 &&
                            ` / ${completion.totalStudents}`}
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
            )}
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
                      href={`/teacher/students/${s.id}`}
                      className="group flex items-center gap-4 px-3 py-2.5 rounded-cozy hover:bg-cream-200 transition-colors"
                    >
                      <p className="flex-1 min-w-0 font-medium text-wood-900 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-wood-500 flex-shrink-0">
                        {s.averagePct === null
                          ? "no grades yet"
                          : `${s.averagePct.toFixed(0)}% avg`}
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
            <h2 className="font-display text-xl text-wood-800">
              Time on task
            </h2>
          </div>
          <Card>
            {timeOnTask.length === 0 ? (
              <p className="text-sm text-wood-600">
                No activity data yet. Time-on-task starts collecting as
                students work on assignments from now on — check back in a few
                class periods.
              </p>
            ) : (
              <div className="space-y-2">
                {timeOnTask.map((t) => (
                  <div
                    key={t.assignmentId}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <p className="text-sm text-wood-800 truncate">
                      {t.assignmentTitle}
                    </p>
                    <p className="text-xs text-wood-500 flex-shrink-0 tabular-nums">
                      <span className="font-display text-base text-wood-800">
                        {t.avgMinutes < 1
                          ? "<1"
                          : Math.round(t.avgMinutes)}
                      </span>{" "}
                      min avg · {t.sampleSize}{" "}
                      {t.sampleSize === 1 ? "student" : "students"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* AI insights */}
        <section>
          <h2 className="font-display text-xl text-wood-800 mb-3">
            AI insights — what they&apos;re struggling with
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AiAnalysisPanel
              mode="assignment"
              title="Analyze an assignment"
              description="Claude reviews every submission and summarizes what the class is commonly getting stuck on."
              options={assignmentOptions}
              apiConfigured={apiConfigured}
            />
            <AiAnalysisPanel
              mode="student"
              title="Analyze a student"
              description="Claude reviews one student's work across assignments and summarizes what they're struggling with."
              options={studentOptions}
              apiConfigured={apiConfigured}
            />
          </div>
        </section>
      </div>
    </>
  );
}
