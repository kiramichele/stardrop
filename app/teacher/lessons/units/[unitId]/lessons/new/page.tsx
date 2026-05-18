import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { getUnit } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { createLesson } from "../../../../actions";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const unit = await getUnit(unitId);
  if (!unit) notFound();

  const action = createLesson.bind(null, unitId);

  return (
    <>
      <Link
        href={`/teacher/lessons/units/${unitId}`}
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {unit.title}
      </Link>

      <PageHeader
        eyebrow={`New lesson · ${unit.title}`}
        title="Add a lesson"
        description="Upload an HTML file. Rise360 exports, single-file slideshows, or any standalone HTML will work."
      />

      <Card className="max-w-2xl">
        <form action={action} className="space-y-5">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Lesson 1 — What is a Game?"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="html_file">HTML file (optional)</Label>
            <div className="flex items-start gap-3 p-4 rounded-cozy border border-dashed border-wood-300 bg-cream-50">
              <FileCode2
                className="w-8 h-8 text-wood-400 flex-shrink-0"
                strokeWidth={1.5}
              />
              <div className="flex-1 min-w-0">
                <Input
                  id="html_file"
                  name="html_file"
                  type="file"
                  accept=".html,text/html"
                  className="file:mr-3 file:py-1.5 file:px-3 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-sm file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer file:transition-colors"
                />
                <FieldHint>
                  You can also upload later from the lesson&apos;s edit page.
                </FieldHint>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href={`/teacher/lessons/units/${unitId}`}>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">Create lesson</Button>
          </div>
        </form>
      </Card>
    </>
  );
}