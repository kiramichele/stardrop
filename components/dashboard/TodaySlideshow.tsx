import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  getSlideshowByDate,
  resolveSlideshowLinks,
} from "@/lib/slideshows-server";
import { todayDateString } from "@/lib/slideshows";

export async function TodaySlideshow({
  role,
}: {
  role: "teacher" | "student";
}) {
  const slideshow = await getSlideshowByDate(todayDateString());

  if (!slideshow) {
    return (
      <Card className="md:col-span-2 bg-honey-50 border-honey-200">
        <p className="label-eyebrow text-honey-700">Today</p>
        <h2 className="font-display text-xl text-wood-900 mt-1">
          Nothing scheduled yet
        </h2>
        <p className="text-sm text-wood-600 mt-1">
          Today&apos;s slideshow and plan will show up here once it&apos;s
          posted.
        </p>
      </Card>
    );
  }

  const { lessons, assignments } = await resolveSlideshowLinks(slideshow);
  const lessonBase = role === "teacher" ? "/teacher/lessons" : "/student/lessons";
  const assignmentBase =
    role === "teacher" ? "/teacher/assignments" : "/student/assignments";

  return (
    <Card className="md:col-span-2 bg-honey-50 border-honey-200">
      <p className="label-eyebrow text-honey-700">Today</p>
      <h2 className="font-display text-xl text-wood-900 mt-1">
        {slideshow.title}
      </h2>
      {slideshow.description && (
        <p className="text-sm text-wood-700 mt-1 whitespace-pre-wrap">
          {slideshow.description}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
        <Link
          href={`/slideshows/${slideshow.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800"
        >
          Open slideshow <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {lessons.map((l) => (
          <Link
            key={l.id}
            href={`${lessonBase}/${l.id}`}
            className="inline-flex items-center gap-1 text-sm text-wood-600 hover:text-terracotta-700"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {l.title}
          </Link>
        ))}
        {assignments.map((a) => (
          <Link
            key={a.id}
            href={`${assignmentBase}/${a.id}`}
            className="inline-flex items-center gap-1 text-sm text-wood-600 hover:text-terracotta-700"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {a.title}
          </Link>
        ))}
      </div>
    </Card>
  );
}
