import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  getSlideshowByDate,
  resolveSlideshowLinks,
  getAssignmentsDueOn,
} from "@/lib/slideshows-server";
import { todayDateString, formatClassDate } from "@/lib/slideshows";
import { getEventsForDate } from "@/lib/calendar-server";
import { dominantDayType, CATEGORY_META } from "@/lib/calendar";

export async function TodaySlideshow({
  role,
}: {
  role: "teacher" | "student";
}) {
  const today = todayDateString();
  const [slideshow, events, dueAssignments] = await Promise.all([
    getSlideshowByDate(today),
    getEventsForDate(today),
    getAssignmentsDueOn(today),
  ]);
  const dayType = dominantDayType(events);

  const lessonBase =
    role === "teacher" ? "/teacher/lessons" : "/student/lessons";
  const assignmentBase =
    role === "teacher" ? "/teacher/assignments" : "/student/assignments";

  const { lessons, assignments } = slideshow
    ? await resolveSlideshowLinks(slideshow)
    : { lessons: [], assignments: [] };

  const title =
    slideshow?.title ??
    (dayType ? CATEGORY_META[dayType].label : "Nothing scheduled yet");

  return (
    <Card className="md:col-span-2 bg-honey-50 border-honey-200">
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow text-honey-700">Today</p>
        {dayType && (
          <span
            className={`text-[0.65rem] font-semibold uppercase tracking-wide-label px-2 py-0.5 rounded-full border ${CATEGORY_META[dayType].chip}`}
          >
            {CATEGORY_META[dayType].label}
          </span>
        )}
      </div>

      <h2 className="font-display text-xl text-wood-900 mt-1">{title}</h2>
      <p className="text-xs text-wood-500">{formatClassDate(today)}</p>

      {slideshow?.description && (
        <p className="text-sm text-wood-700 mt-2 whitespace-pre-wrap">
          {slideshow.description}
        </p>
      )}

      {!slideshow && !dayType && (
        <p className="text-sm text-wood-600 mt-2">
          Today&apos;s plan will show up here once it&apos;s posted.
        </p>
      )}

      {events.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {events.map((e) => (
            <span
              key={e.id}
              className={`text-[0.7rem] px-1.5 py-0.5 rounded border ${CATEGORY_META[e.category].chip}`}
            >
              {e.title}
            </span>
          ))}
        </div>
      )}

      {dueAssignments.length > 0 && (
        <div className="mt-3">
          <p className="label-eyebrow text-wood-500 mb-1">Due today</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {dueAssignments.map((a) => (
              <Link
                key={a.id}
                href={`${assignmentBase}/${a.id}`}
                className="inline-flex items-center gap-1 text-sm text-wood-700 hover:text-terracotta-700"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {slideshow?.asyncNote && (
        <div className="mt-3 flex items-start gap-2 rounded-cozy bg-cream-50 border border-wood-100 px-2.5 py-2">
          <Clock
            className="w-3.5 h-3.5 text-wood-500 flex-shrink-0 mt-0.5"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="label-eyebrow text-wood-500">Period 3 — async</p>
            <p className="text-sm text-wood-700 whitespace-pre-wrap">
              {slideshow.asyncNote}
            </p>
          </div>
        </div>
      )}

      {slideshow && (
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
      )}
    </Card>
  );
}
