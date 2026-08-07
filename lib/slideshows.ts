// Client-safe: slideshow type + date helper.

export type Slideshow = {
  id: string;
  classDate: string; // "YYYY-MM-DD"
  title: string;
  description: string | null;
  htmlUrl: string | null;
  lessonIds: string[];
  assignmentIds: string[];
  /** Free-text plan for the Period 3 async ("Personalized Learning") block. */
  asyncNote: string | null;
};

/**
 * Format a "YYYY-MM-DD" class date for display. Parses the parts manually
 * so the date doesn't shift a day from UTC interpretation.
 */
export function formatClassDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Today's date as "YYYY-MM-DD" in local time. */
// The school runs on Eastern time, but the server clock is UTC — so after
// ~8pm Eastern the UTC date is already "tomorrow". Compute the calendar date
// (and compare due dates) in America/New_York so "today" matches the room.
const EASTERN_TZ = "America/New_York";

/** A Date's calendar date in Eastern time, as "YYYY-MM-DD". */
export function easternDateString(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: EASTERN_TZ }).format(d);
}

export function todayDateString(): string {
  return easternDateString(new Date());
}

/**
 * The Monday of the week containing `dateStr` ("YYYY-MM-DD"), as a
 * "YYYY-MM-DD" string. Used to group slideshows by school week.
 */
export function weekStartString(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0=Sun .. 6=Sat
  const back = dow === 0 ? 6 : dow - 1; // step back to Monday
  date.setDate(date.getDate() - back);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * A Mon–Fri label for a week given its Monday ("YYYY-MM-DD"),
 * e.g. "May 18 – 22" or "May 30 – Jun 3".
 */
export function formatWeekRange(weekStartStr: string): string {
  const [y, m, d] = weekStartStr.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const fri = new Date(y, m - 1, d + 4);
  const shortMonth = (dt: Date) =>
    dt.toLocaleDateString(undefined, { month: "short" });
  if (mon.getMonth() === fri.getMonth()) {
    return `${shortMonth(mon)} ${mon.getDate()} – ${fri.getDate()}`;
  }
  return `${shortMonth(mon)} ${mon.getDate()} – ${shortMonth(fri)} ${fri.getDate()}`;
}
