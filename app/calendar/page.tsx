import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/calendar-server";
import { getSlideshows } from "@/lib/slideshows-server";
import { parseMonthParam } from "@/lib/calendar";
import { effectiveDueDate, asExtendedTime } from "@/lib/assignments";
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
  const [events, slideshows, assignmentsRes, lessonsRes, enrollmentsRes] =
    await Promise.all([
      getCalendarEvents(),
      getSlideshows(),
      admin
        .from("assignments")
        .select(
          "id, title, due_date, due_date_1_5x, due_date_2x, published, class_id, assignment_group_id"
        ),
      admin.from("lessons").select("id, title"),
      // A student only sees deadlines for their own class(es); assignments are
      // stored one copy per class, so without this they'd see every period's
      // duplicate. Teachers see all classes.
      role === "student"
        ? admin.from("enrollments").select("class_id").eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

  const enrolledClassIds =
    role === "student"
      ? new Set(
          (enrollmentsRes.data ?? []).map(
            (e) => (e as { class_id: string }).class_id
          )
        )
      : null;

  // A student's own extended-time tier drives which due date they're held to.
  const tier =
    role === "student"
      ? asExtendedTime((user as { extended_time?: unknown }).extended_time)
      : "none";

  // Title lookups so the day-detail popup can name a slideshow's links.
  const lessonTitle = new Map<string, string>();
  for (const l of lessonsRes.data ?? []) lessonTitle.set(l.id, l.title);
  // Per-assignment metadata so we can filter/dedupe the copies a slideshow
  // links (assignments are stored one copy per class).
  const assignmentMeta = new Map<
    string,
    { title: string; classId: string; groupId: string | null }
  >();
  for (const a of assignmentsRes.data ?? []) {
    assignmentMeta.set(a.id, {
      title: a.title,
      classId: (a as { class_id: string }).class_id,
      groupId: (a as { assignment_group_id: string | null })
        .assignment_group_id,
    });
  }

  const slideshowsEnriched = slideshows.map((s) => {
    // A slideshow links every per-class copy of an assignment. Show a student
    // only their class's copy, and collapse the rest to one per assignment.
    const seenLink = new Set<string>();
    const assignments = s.assignmentIds
      .map((id) => ({ id, meta: assignmentMeta.get(id) }))
      .filter(
        ({ meta }) =>
          enrolledClassIds === null ||
          (!!meta && enrolledClassIds.has(meta.classId))
      )
      .filter(({ id, meta }) => {
        const key = meta?.groupId ?? id;
        if (seenLink.has(key)) return false;
        seenLink.add(key);
        return true;
      })
      .map(({ id, meta }) => ({ id, title: meta?.title ?? "Assignment" }));
    return {
      date: s.classDate,
      id: s.id,
      title: s.title,
      description: s.description,
      lessons: s.lessonIds.map((id) => ({
        id,
        title: lessonTitle.get(id) ?? "Lesson",
      })),
      assignments,
    };
  });

  // Collapse the per-class copies of one assignment into a single calendar
  // entry (by shared group id; fall back to title+date for older copies), so
  // the same deadline isn't repeated once per class.
  const seenAssignment = new Set<string>();
  const assignmentsDue = (assignmentsRes.data ?? [])
    .filter((a) => a.published && typeof a.due_date === "string")
    // Students: only deadlines from a class they're enrolled in.
    .filter(
      (a) =>
        enrolledClassIds === null ||
        enrolledClassIds.has((a as { class_id: string }).class_id)
    )
    .filter((a) => {
      const groupId = (a as { assignment_group_id: string | null })
        .assignment_group_id;
      const key = groupId ?? `${a.title}|${(a.due_date as string).slice(0, 10)}`;
      if (seenAssignment.has(key)) return false;
      seenAssignment.add(key);
      return true;
    })
    .map((a) => {
      // Hold a 1.5×/2× student to their extended due date when the teacher set
      // one; otherwise this falls back to the regular date.
      const effective =
        effectiveDueDate(
          a as {
            due_date: string | null;
            due_date_1_5x?: string | null;
            due_date_2x?: string | null;
          },
          tier
        ) ?? (a.due_date as string);
      return {
        date: (effective as string).slice(0, 10),
        id: a.id,
        title: a.title,
      };
    });

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
