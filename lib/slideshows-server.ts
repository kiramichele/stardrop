import { createAdminClient } from "@/lib/supabase/admin";
import type { Slideshow } from "@/lib/slideshows";

// =============================================================
// TEMPORARY: the `slideshows` table isn't in types/database.ts yet.
// After applying the migration, regenerate types and replace
// slideshowsTable() with admin.from("slideshows") directly.
// =============================================================
type SlideshowRow = {
  id: string;
  class_date: string;
  title: string;
  description: string | null;
  html_url: string | null;
  lesson_ids: string[] | null;
  assignment_ids: string[] | null;
  async_note: string | null;
};

export type SlideshowInsert = {
  class_date: string;
  title: string;
  description: string | null;
  lesson_ids: string[];
  assignment_ids: string[];
  async_note: string | null;
};

export type SlideshowPatch = Partial<{
  class_date: string;
  title: string;
  description: string | null;
  html_url: string | null;
  lesson_ids: string[];
  assignment_ids: string[];
  async_note: string | null;
  updated_at: string;
}>;

type SlideshowsTable = {
  select: (cols: string) => {
    order: (
      col: string,
      opts: { ascending: boolean }
    ) => Promise<{ data: SlideshowRow[] | null }>;
    eq: (
      col: string,
      val: string
    ) => { maybeSingle: () => Promise<{ data: SlideshowRow | null }> };
  };
  insert: (row: SlideshowInsert) => {
    select: (cols: string) => {
      single: () => Promise<{
        data: { id: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
  update: (patch: SlideshowPatch) => {
    eq: (
      col: string,
      val: string
    ) => Promise<{ error: { message: string } | null }>;
  };
  delete: () => {
    eq: (
      col: string,
      val: string
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function slideshowsTable(
  admin: ReturnType<typeof createAdminClient>
): SlideshowsTable {
  return (
    admin as unknown as { from: (t: string) => SlideshowsTable }
  ).from("slideshows");
}

function rowToSlideshow(r: SlideshowRow): Slideshow {
  return {
    id: r.id,
    classDate: r.class_date,
    title: r.title,
    description: r.description,
    htmlUrl: r.html_url,
    lessonIds: r.lesson_ids ?? [],
    assignmentIds: r.assignment_ids ?? [],
    asyncNote: r.async_note ?? null,
  };
}

export async function getSlideshows(): Promise<Slideshow[]> {
  const { data } = await slideshowsTable(createAdminClient())
    .select("*")
    .order("class_date", { ascending: false });
  return (data ?? []).map(rowToSlideshow);
}

export async function getSlideshowByDate(
  date: string
): Promise<Slideshow | null> {
  const { data } = await slideshowsTable(createAdminClient())
    .select("*")
    .eq("class_date", date)
    .maybeSingle();
  return data ? rowToSlideshow(data) : null;
}

export async function getSlideshow(id: string): Promise<Slideshow | null> {
  const { data } = await slideshowsTable(createAdminClient())
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? rowToSlideshow(data) : null;
}

export async function insertSlideshowRow(row: SlideshowInsert) {
  return slideshowsTable(createAdminClient())
    .insert(row)
    .select("id")
    .single();
}

export async function updateSlideshowRow(id: string, patch: SlideshowPatch) {
  return slideshowsTable(createAdminClient()).update(patch).eq("id", id);
}

export async function deleteSlideshowRow(id: string) {
  return slideshowsTable(createAdminClient()).delete().eq("id", id);
}

/** Resolve a slideshow's linked lesson/assignment ids to titles. */
export async function resolveSlideshowLinks(s: Slideshow): Promise<{
  lessons: Array<{ id: string; title: string }>;
  assignments: Array<{ id: string; title: string }>;
}> {
  const admin = createAdminClient();
  let lessons: Array<{ id: string; title: string }> = [];
  let assignments: Array<{ id: string; title: string }> = [];

  if (s.lessonIds.length > 0) {
    const { data } = await admin
      .from("lessons")
      .select("id, title")
      .in("id", s.lessonIds);
    lessons = data ?? [];
  }
  if (s.assignmentIds.length > 0) {
    const { data } = await admin
      .from("assignments")
      .select("id, title")
      .in("id", s.assignmentIds);
    assignments = data ?? [];
  }
  return { lessons, assignments };
}

/**
 * Published assignments whose due date lands on `date` ("YYYY-MM-DD").
 * Powers the "assignments due today" line on the daily plan.
 */
export async function getAssignmentsDueOn(
  date: string
): Promise<Array<{ id: string; title: string }>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignments")
    .select("id, title, due_date")
    .eq("published", true);
  return (data ?? [])
    .filter(
      (a) => typeof a.due_date === "string" && a.due_date.slice(0, 10) === date
    )
    .map((a) => ({ id: a.id, title: a.title }));
}
