import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const [events, slideshows, assignmentsResult] = await Promise.all([
    getCalendarEvents(),
    getSlideshows(),
    supabase
      .from("assignments")
      .select("id, title, due_date")
      .eq("published", true),
  ]);

  const slideshowsByDate = slideshows.map((s) => ({
    date: s.classDate,
    id: s.id,
    title: s.title,
  }));

  const assignmentsDue = (assignmentsResult.data ?? [])
    .filter((a) => typeof a.due_date === "string")
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
        description="The GCA 2026–27 calendar, your daily plans, and assignment deadlines — plus the weekly bell schedule."
      />
      <CalendarClient
        role={role}
        year={year}
        month={monthIndex}
        events={events}
        slideshows={slideshowsByDate}
        assignmentsDue={assignmentsDue}
      />
    </>
  );
}
