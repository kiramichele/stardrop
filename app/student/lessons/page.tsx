import { BookOpen, Check } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getUnitsForStudent } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LessonRow } from "@/components/lessons/LessonRow";

export default async function StudentLessonsPage() {
  const user = await requireStudent();
  const units = await getUnitsForStudent(user.id);

  const totalLessons = units.reduce((sum, u) => sum + u.lessons.length, 0);
  const completedLessons = units.reduce(
    (sum, u) => sum + u.lessons.filter((l) => l.completed).length,
    0
  );

  return (
    <>
      <PageHeader
        eyebrow="Game Design"
        title="Lessons"
        description="Work through units in order. Each lesson builds on the last."
      />

      {totalLessons > 0 && (
        <Card className="mb-6 bg-honey-50 border-honey-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-honey-100 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-honey-700" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="label-eyebrow text-honey-700">Progress</p>
              <p className="font-display text-lg text-wood-900 mt-0.5">
                {completedLessons} of {totalLessons} lessons complete
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl text-honey-700">
                {Math.round((completedLessons / totalLessons) * 100)}%
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-honey-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-honey-500 transition-all duration-500"
              style={{
                width: `${(completedLessons / totalLessons) * 100}%`,
              }}
            />
          </div>
        </Card>
      )}

      {units.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No lessons yet"
            description="Ms. Shinn hasn't published any lessons yet. Check back soon!"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {units.map((unit, idx) => (
            <div key={unit.id}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display text-2xl text-wood-400">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-2xl text-wood-900">
                  {unit.title}
                </h2>
              </div>
              {unit.description && (
                <p className="text-wood-600 mb-3 ml-11">{unit.description}</p>
              )}
              {unit.lessons.length === 0 ? (
                <Card>
                  <p className="text-sm text-wood-500 text-center py-2">
                    No lessons in this unit yet.
                  </p>
                </Card>
              ) : (
                <Card padded={false} className="overflow-hidden">
                  <ul className="divide-y divide-wood-100">
                    {unit.lessons.map((lesson) => (
                      <li key={lesson.id} className="p-1.5">
                        <LessonRow
                          lesson={lesson}
                          href={`/student/lessons/${lesson.id}`}
                          role="student"
                        />
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}