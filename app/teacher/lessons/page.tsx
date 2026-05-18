import Link from "next/link";
import { BookOpen, Plus, ArrowRight, Eye, EyeOff } from "lucide-react";
import { getUnitsForTeacher } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TeacherLessonsPage() {
  const units = await getUnitsForTeacher();

  return (
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Lessons"
        description="Build out units and lessons. Drop in your Rise360-style HTML files and Stardrop renders them."
        action={
          <Link href="/teacher/lessons/units/new">
            <Button>
              <Plus className="w-4 h-4" strokeWidth={2} />
              New unit
            </Button>
          </Link>
        }
      />

      {units.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No units yet"
            description="Start by creating a unit. Each unit holds an ordered list of lessons."
            action={
              <Link href="/teacher/lessons/units/new">
                <Button>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create your first unit
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {units.map((unit, idx) => {
            const lessonCount = unit.lessons.length;
            const publishedLessons = unit.lessons.filter(
              (l) => l.published
            ).length;
            return (
              <Link
                key={unit.id}
                href={`/teacher/lessons/units/${unit.id}`}
                className="block"
              >
                <Card hoverable className="group">
                  <div className="flex items-center gap-5">
                    <div className="font-display text-2xl text-wood-400 w-8 flex-shrink-0 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-display text-xl text-wood-900 truncate">
                          {unit.title}
                        </h2>
                        {unit.published ? (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
                            <Eye className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </div>
                      {unit.description && (
                        <p className="text-sm text-wood-600 line-clamp-1">
                          {unit.description}
                        </p>
                      )}
                      <p className="text-xs text-wood-500 mt-1">
                        {lessonCount}{" "}
                        {lessonCount === 1 ? "lesson" : "lessons"}
                        {lessonCount > 0 &&
                          ` · ${publishedLessons} published`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-1 flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}