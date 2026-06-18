import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { getUnitsForTeacher } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TeacherUnitsList,
  type UnitsListItem,
} from "@/components/lessons/TeacherUnitsList";

export default async function TeacherLessonsPage() {
  const units = await getUnitsForTeacher();
  const items: UnitsListItem[] = units.map((u) => ({
    id: u.id,
    title: u.title,
    description: u.description,
    published: u.published,
    lessonCount: u.lessons.length,
    publishedLessonCount: u.lessons.filter((l) => l.published).length,
  }));

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

      {items.length === 0 ? (
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
        <TeacherUnitsList units={items} />
      )}
    </>
  );
}
