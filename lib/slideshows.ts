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
export function todayDateString(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}
