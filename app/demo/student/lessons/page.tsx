import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DEMO_UNITS, DEMO_LESSON_TOTAL } from "@/lib/demo/fixtures";

export default function DemoStudentLessons() {
  const completed = DEMO_UNITS.reduce(
    (sum, u) => sum + u.lessons.filter((l) => l.completed).length,
    0
  );
  const pct = Math.round((completed / DEMO_LESSON_TOTAL) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Game Design"
        title="Lessons"
        description="Work through units in order. Each lesson builds on the last."
      />

      <Card className="mb-6 bg-honey-50 border-honey-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-honey-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-honey-700" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="label-eyebrow text-honey-700">Progress</p>
            <p className="font-display text-lg text-wood-900 mt-0.5">
              {completed} of {DEMO_LESSON_TOTAL} lessons complete
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-honey-700">{pct}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-honey-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-honey-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <div className="space-y-6">
        {DEMO_UNITS.map((unit, idx) => (
          <div key={unit.id}>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-display text-2xl text-wood-400">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h2 className="font-display text-2xl text-wood-900">
                {unit.title}
              </h2>
            </div>
            <p className="text-wood-600 mb-3 ml-11">{unit.description}</p>
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id} className="p-1.5">
                    <Link
                      href="/demo/student/lessons"
                      className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                    >
                      {lesson.completed ? (
                        <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </span>
                      ) : (
                        <Circle
                          className="w-6 h-6 text-wood-300 flex-shrink-0"
                          strokeWidth={1.5}
                        />
                      )}
                      <p
                        className={[
                          "flex-1 min-w-0 truncate",
                          lesson.completed
                            ? "text-wood-600"
                            : "font-medium text-wood-900",
                        ].join(" ")}
                      >
                        {lesson.title}
                      </p>
                      {lesson.completed ? (
                        <span className="text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700 flex-shrink-0">
                          Done
                        </span>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
