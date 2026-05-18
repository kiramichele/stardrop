import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getLesson } from "@/lib/lessons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function TeacherLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireTeacher();
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  return (
    <>
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader eyebrow="Lesson" title={lesson.title} />

      <Card>
        <p className="text-sm text-wood-600">
          Teacher lesson view coming soon.
        </p>
      </Card>
    </>
  );
}
