import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/calendar-server";
import { getSlideshows } from "@/lib/slideshows-server";
import { parseMonthParam } from "@/lib/calendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const role: "teacher" | "student" =
    user.role === "teacher" ? "teacher" : "student";
  const { month } = await searchParams;
  const { year, month: monthIndex } = parseMonthParam(month);

  const admin = createAdminClient();
  const [events, slideshows, assignmentsRes, lessonsRes] = await Promise.all([
    getCalendarEvents(),
    getSlideshows(),
    admin.from("assignments").select("id, title, due_date, published"),
    admin.from("lessons").select("id, title"),
  ]);

  // Title lookups so the day-detail popup can name a slideshow's links.
  const lessonTitle = new Map<string, string>();
  for (const l of lessonsRes.data ?? []) lessonTitle.set(l.id, l.title);
  const assignmentTitle = new Map<string, string>();
  for (const a of assignmentsRes.data ?? []) assignmentTitle.set(a.id, a.title);

  const slideshowsEnriched = slideshows.map((s) => ({
    date: s.classDate,
    id: s.id,
    title: s.title,
    description: s.description,
    lessons: s.lessonIds.map((id) => ({
      id,
      title: lessonTitle.get(id) ?? "Lesson",
    })),
    assignments: s.assignmentIds.map((id) => ({
      id,
      title: assignmentTitle.get(id) ?? "Assignment",
    })),
  }));

  const assignmentsDue = (assignmentsRes.data ?? [])
    .filter((a) => a.published && typeof a.due_date === "string")
    .map((a) => ({
      date: (a.due_date as string).slice(0, 10),
      id: a.id,
      title: a.title,
    }));

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="School calendar"
        description="The GCA 2026–27 calendar, your daily plans, and assignment deadlines. Click any day for the full plan."
      />
      <CalendarClient
        role={role}
        year={year}
        month={monthIndex}
        events={events}
        slideshows={slideshowsEnriched}
        assignmentsDue={assignmentsDue}
      />
    </>
  );
}
