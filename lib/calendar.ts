// Client-safe: school-calendar types, category styling, date helpers.

export type CalendarCategory =
  | "holiday"
  | "teacher_workday"
  | "testing"
  | "event"
  | "student_date"
  | "eld"
  | "async";

export type CalendarEvent = {
  id: string;
  date: string; // "YYYY-MM-DD"
  endDate: string | null; // inclusive; null = single day
  title: string;
  category: CalendarCategory;
  note: string | null;
};

type CategoryMeta = {
  label: string;
  /** Small pill: background + text + border. */
  chip: string;
  /** Solid dot color. */
  dot: string;
  /** Day-cell background tint (only used for "day type" categories). */
  cellBg: string;
};

export const CATEGORY_META: Record<CalendarCategory, CategoryMeta> = {
  holiday: {
    label: "No school",
    chip: "bg-terracotta-100 text-terracotta-800 border-terracotta-200",
    dot: "bg-terracotta-500",
    cellBg: "bg-terracotta-50",
  },
  teacher_workday: {
    label: "Teacher work day",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    cellBg: "bg-emerald-50",
  },
  async: {
    label: "Async day",
    chip: "bg-wood-100 text-wood-800 border-wood-200",
    dot: "bg-wood-500",
    cellBg: "bg-wood-50",
  },
  eld: {
    label: "Enhanced Learning Day",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
    cellBg: "bg-violet-50",
  },
  testing: {
    label: "Testing",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
    cellBg: "bg-sky-50",
  },
  event: {
    label: "School event",
    chip: "bg-indigo-100 text-indigo-800 border-indigo-200",
    dot: "bg-indigo-500",
    cellBg: "bg-indigo-50",
  },
  student_date: {
    label: "Key date",
    chip: "bg-honey-100 text-honey-800 border-honey-200",
    dot: "bg-honey-500",
    cellBg: "bg-honey-50",
  },
};

// Categories that change the nature of the day (used to tint a day cell).
// Ordered by priority — first match wins.
const DAY_TYPE_PRIORITY: CalendarCategory[] = [
  "holiday",
  "teacher_workday",
  "async",
  "eld",
];

/** The dominant "day type" among a date's events, or null for a normal day. */
export function dominantDayType(
  events: CalendarEvent[]
): CalendarCategory | null {
  for (const cat of DAY_TYPE_PRIORITY) {
    if (events.some((e) => e.category === cat)) return cat;
  }
  return null;
}

/** True if `dateStr` ("YYYY-MM-DD") falls within an event's span (inclusive). */
export function eventCoversDate(ev: CalendarEvent, dateStr: string): boolean {
  if (ev.endDate) return dateStr >= ev.date && dateStr <= ev.endDate;
  return dateStr === ev.date;
}

// =============================================================
// Date helpers — all local-time to avoid UTC day shifts.
// =============================================================

/** A Date -> "YYYY-MM-DD" in local time. */
export function dateString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Today as "YYYY-MM-DD" local. */
export function todayString(): string {
  return dateString(new Date());
}

/** Parse "YYYY-MM" into { year, month } (month 0-indexed). Falls back to now. */
export function parseMonthParam(param: string | undefined): {
  year: number;
  month: number;
} {
  const now = new Date();
  if (param) {
    const [y, m] = param.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

/** "YYYY-MM" string for a year + 0-indexed month. */
export function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** "September 2026" */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** Year + 0-indexed month, shifted by `delta` months. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * 6-week grid (Sun-first) of Date objects covering the given month,
 * including leading/trailing days from adjacent months.
 */
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(year, month, 1 - first.getDay() + w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
