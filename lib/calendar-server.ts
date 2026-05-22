import { createAdminClient } from "@/lib/supabase/admin";
import {
  eventCoversDate,
  type CalendarCategory,
  type CalendarEvent,
} from "@/lib/calendar";

// =============================================================
// TEMPORARY: `calendar_events` isn't in types/database.ts yet.
// After applying the migration, regenerate types and replace
// calendarTable() with admin.from("calendar_events") directly.
// =============================================================
type CalendarRow = {
  id: string;
  event_date: string;
  end_date: string | null;
  title: string;
  category: string;
  note: string | null;
};

type CalendarTable = {
  select: (cols: string) => {
    order: (
      col: string,
      opts: { ascending: boolean }
    ) => Promise<{ data: CalendarRow[] | null }>;
  };
};

function calendarTable(
  admin: ReturnType<typeof createAdminClient>
): CalendarTable {
  return (
    admin as unknown as { from: (t: string) => CalendarTable }
  ).from("calendar_events");
}

function rowToEvent(r: CalendarRow): CalendarEvent {
  return {
    id: r.id,
    date: r.event_date,
    endDate: r.end_date,
    title: r.title,
    category: r.category as CalendarCategory,
    note: r.note,
  };
}

/** Every calendar event, oldest first. The table holds ~one school year. */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const { data } = await calendarTable(createAdminClient())
    .select("*")
    .order("event_date", { ascending: true });
  return (data ?? []).map(rowToEvent);
}

/** Events whose span covers a single "YYYY-MM-DD" date. */
export async function getEventsForDate(
  date: string
): Promise<CalendarEvent[]> {
  const all = await getCalendarEvents();
  return all.filter((e) => eventCoversDate(e, date));
}
