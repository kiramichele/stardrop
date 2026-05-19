import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLessonNote } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { LessonViewer } from "@/components/lessons/LessonViewer";
import { LessonNotes } from "@/components/lessons/LessonNotes";

// NOTE: If your current page has linear-gating logic (checking if previous
// lessons in the unit are completed before allowing access), preserve that
// logic here. The change is only the new grid layout + LessonNotes panel.

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, title, html_url, unit_id, order, completion_required_for_next, units(id, title)"
    )
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();

  if (!lesson || !lesson.html_url) notFound();

  const unit = Array.isArray(lesson.units) ? lesson.units[0] : lesson.units;

  // Has the current student completed this lesson?
  const { data: completion } = await supabase
    .from("lesson_completions")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // The current student's note for this lesson (null if they haven't written anything yet)
  const note = await getLessonNote(lessonId, user.id);

  return (
    <>
      <Link
        href="/student/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader
        eyebrow={unit?.title}
        title={lesson.title}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LessonViewer
            lessonId={lesson.id}
            htmlUrl={lesson.html_url}
            isCompleted={!!completion}
          />
        </div>

        <div>
          <LessonNotes
            lessonId={lesson.id}
            initialContent={note?.content ?? ""}
            initialLastSaved={note?.updated_at ?? null}
          />
        </div>
      </div>
    </>
  );
}