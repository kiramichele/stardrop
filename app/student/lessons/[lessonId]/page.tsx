import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getLessonForStudent } from "@/lib/lessons";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { LessonViewer } from "@/components/lessons/LessonViewer";
import { markLessonComplete } from "@/app/teacher/lessons/actions";

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await requireStudent();
  const result = await getLessonForStudent(lessonId, user.id);
  if (!result) notFound();

  const { lesson, unit, completed, locked } = result;
  const markComplete = markLessonComplete.bind(null, lessonId);

  const PROXY_PREFIX = "/api/files/lessons/";
  let htmlContent: string | null = null;
  if (!locked && lesson.html_url) {
    if (lesson.html_url.startsWith(PROXY_PREFIX)) {
      const storagePath = lesson.html_url.slice(PROXY_PREFIX.length);
      const { data } = await createAdminClient()
        .storage.from("lessons")
        .download(storagePath);
      if (data) htmlContent = await data.text();
    } else {
      try {
        const res = await fetch(lesson.html_url, { cache: "no-store" });
        if (res.ok) htmlContent = await res.text();
      } catch {}
    }
  }

  return (
    <>
      <Link
        href="/student/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to lessons
      </Link>

      <PageHeader eyebrow={unit.title} title={lesson.title} />

      <LessonViewer
        htmlContent={htmlContent}
        completed={completed}
        locked={locked}
        onMarkComplete={markComplete}
      />
    </>
  );
}