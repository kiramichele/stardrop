import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { getUnit } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { LessonRow } from "@/components/lessons/LessonRow";
import { updateUnit, deleteUnit } from "../../actions";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) notFound();

  const updateAction = updateUnit.bind(null, unitId);
  const deleteAction = deleteUnit.bind(null, unitId);

  return (
    <>
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader
        eyebrow="Unit"
        title={unit.title}
        description={unit.description ?? undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lessons column — wider */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-wood-800">Lessons</h2>
            <Link href={`/teacher/lessons/units/${unitId}/lessons/new`}>
              <Button size="sm">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                Add lesson
              </Button>
            </Link>
          </div>

          {unit.lessons.length === 0 ? (
            <Card>
              <EmptyState
                icon={BookOpen}
                title="No lessons yet"
                description="Add your first lesson by uploading an HTML file."
                action={
                  <Link href={`/teacher/lessons/units/${unitId}/lessons/new`}>
                    <Button>
                      <Plus className="w-4 h-4" strokeWidth={2} />
                      Add lesson
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id} className="p-1.5">
                    <LessonRow
                      lesson={lesson}
                      href={`/teacher/lessons/${lesson.id}`}
                      role="teacher"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Unit settings column */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Unit settings
            </h3>
            <form action={updateAction} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={unit.title}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={unit.description ?? ""}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  defaultChecked={unit.published}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                />
                <Label htmlFor="published" className="mb-0">
                  Published (visible to students)
                </Label>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save changes
              </Button>
            </form>
          </Card>

          <Card className="border-terracotta-200 bg-terracotta-50/50">
            <h3 className="font-display text-base text-terracotta-900 mb-1">
              Danger zone
            </h3>
            <p className="text-xs text-terracotta-800 mb-3">
              Deleting a unit also deletes its lessons.
            </p>
            <form action={deleteAction}>
              <Button type="submit" variant="danger" size="sm" className="w-full">
                Delete unit
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}