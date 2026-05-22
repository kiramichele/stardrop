import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, no-login lesson view — the link teachers paste into Canvas.
// Only published lessons are reachable; everything else 404s.

// Cached per-request so generateMetadata and the page share one fetch.
const getPublicLesson = cache(async function getPublicLesson(
  lessonId: string
) {
  const admin = createAdminClient();
  const { data: lesson } = await admin
    .from("lessons")
    .select("id, title, html_url, published, units(title)")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();
  if (!lesson) return null;

  const unit = Array.isArray(lesson.units) ? lesson.units[0] : lesson.units;

  let html: string | null = null;
  if (lesson.html_url) {
    const { data } = await admin.storage
      .from("lessons")
      .download(`${lessonId}.html`);
    if (data) html = await data.text();
  }

  return { title: lesson.title, unitTitle: unit?.title ?? null, html };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await getPublicLesson(lessonId);
  return { title: lesson ? `${lesson.title} · Stardrop` : "Lesson · Stardrop" };
}

export default async function PublicLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getPublicLesson(lessonId);
  if (!lesson) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-wood-100 bg-cream-50 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-lg text-terracotta-700 leading-none">
              Stardrop
            </span>
            <span className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold">
              Game Design
            </span>
          </p>
          {lesson.unitTitle && (
            <p className="label-eyebrow text-wood-500 mt-2">
              {lesson.unitTitle}
            </p>
          )}
          <h1 className="font-display text-2xl text-wood-900 leading-tight">
            {lesson.title}
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {lesson.html ? (
          <iframe
            srcDoc={lesson.html}
            // allow-scripts so interactive lessons work; intentionally no
            // allow-same-origin so the lesson can't reach back into Stardrop.
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="flex-1 w-full border-0 bg-white"
            style={{ minHeight: "75vh" }}
            title={lesson.title}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-10">
            <p className="text-sm text-wood-600">
              This lesson doesn&apos;t have any content yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
