import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getLesson } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldHint } from "@/components/ui/Input";
import { LessonViewer } from "@/components/lessons/LessonViewer";
import { updateLesson, deleteLesson } from "../actions";

export default async function TeacherLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireTeacher();
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  let htmlContent: string | null = null;
  let fetchStatus: number | null = null;
  let fetchError: string | null = null;
  if (lesson.html_url) {
    try {
      const res = await fetch(lesson.html_url, { cache: "no-store" });
      fetchStatus = res.status;
      if (res.ok) htmlContent = await res.text();
      else fetchError = `HTTP ${res.status}`;
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }
  }

  const updateAction = updateLesson.bind(null, lessonId);
  const deleteAction = deleteLesson.bind(null, lessonId);

  return (
    <>
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader eyebrow="Lesson preview" title={lesson.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <LessonViewer
            htmlContent={htmlContent}
            completed={false}
            locked={false}
          />
          <Card className="bg-honey-50 border-honey-200">
            <p className="text-xs font-mono text-wood-700 break-all">
              <strong>debug:</strong> html_url ={" "}
              {lesson.html_url ?? <em>null</em>}
              {fetchStatus !== null && <> · status: {fetchStatus}</>}
              {fetchError && <> · error: {fetchError}</>}
              {htmlContent && <> · bytes: {htmlContent.length}</>}
            </p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Lesson settings
            </h3>
            <form action={updateAction} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={lesson.title}
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  defaultChecked={lesson.published}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                />
                <Label htmlFor="published" className="mb-0">
                  Published (visible to students)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="completion_required_for_next"
                  name="completion_required_for_next"
                  defaultChecked={lesson.completion_required_for_next}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                />
                <Label htmlFor="completion_required_for_next" className="mb-0">
                  Required to unlock next lesson
                </Label>
              </div>

              <div>
                <Label htmlFor="html_file">Replace HTML</Label>
                <div className="flex items-start gap-3 p-3 rounded-cozy border border-dashed border-wood-300 bg-cream-50">
                  <FileCode2
                    className="w-6 h-6 text-wood-400 flex-shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1 min-w-0">
                    <Input
                      id="html_file"
                      name="html_file"
                      type="file"
                      accept=".html,text/html"
                      className="file:mr-2 file:py-1 file:px-2 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-xs file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer file:transition-colors text-sm"
                    />
                    <FieldHint>
                      Leave empty to keep the current file.
                    </FieldHint>
                  </div>
                </div>
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
              Deleting removes the lesson and its uploaded HTML.
            </p>
            <form action={deleteAction}>
              <Button type="submit" variant="danger" size="sm" className="w-full">
                Delete lesson
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
