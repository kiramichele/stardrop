import { createClient } from "@/lib/supabase/server";

export type Unit = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  published: boolean;
};

export type Lesson = {
  id: string;
  unit_id: string;
  title: string;
  html_url: string | null;
  order: number;
  completion_required_for_next: boolean;
  published: boolean;
};

export type LessonWithStatus = Lesson & {
  completed: boolean;
  locked: boolean;
};

export type UnitWithLessons = Unit & {
  lessons: LessonWithStatus[];
};

/**
 * Student view: published units only, with completion + lock state.
 * Linear within a unit — if lesson N requires completion and isn't done,
 * lessons after N are locked. Units themselves are always open.
 */
export async function getUnitsForStudent(
  userId: string
): Promise<UnitWithLessons[]> {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("*")
    .eq("published", true)
    .order("order");

  if (!units || units.length === 0) return [];

  const unitIds = units.map((u) => u.id);

  const [{ data: lessons }, { data: completions }] = await Promise.all([
    supabase
      .from("lessons")
      .select("*")
      .eq("published", true)
      .in("unit_id", unitIds)
      .order("order"),
    supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", userId),
  ]);

  const completedSet = new Set(completions?.map((c) => c.lesson_id) ?? []);

  return units.map((unit) => {
    const unitLessons = (lessons ?? []).filter((l) => l.unit_id === unit.id);
    let prevRequiredIncomplete = false;
    const withStatus: LessonWithStatus[] = unitLessons.map((lesson) => {
      const completed = completedSet.has(lesson.id);
      const locked = prevRequiredIncomplete;
      if (lesson.completion_required_for_next && !completed) {
        prevRequiredIncomplete = true;
      }
      return { ...lesson, completed, locked };
    });
    return { ...unit, lessons: withStatus };
  });
}

/**
 * Teacher view: all units regardless of publish state, all lessons.
 */
export async function getUnitsForTeacher(): Promise<UnitWithLessons[]> {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("*")
    .order("order");

  if (!units || units.length === 0) return [];

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .in("unit_id", units.map((u) => u.id))
    .order("order");

  return units.map((unit) => ({
    ...unit,
    lessons: (lessons ?? [])
      .filter((l) => l.unit_id === unit.id)
      .map((l) => ({ ...l, completed: false, locked: false })),
  }));
}

export async function getUnit(unitId: string): Promise<UnitWithLessons | null> {
  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("id", unitId)
    .single();
  if (!unit) return null;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("unit_id", unitId)
    .order("order");

  return {
    ...unit,
    lessons: (lessons ?? []).map((l) => ({
      ...l,
      completed: false,
      locked: false,
    })),
  };
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();
  return data;
}

/**
 * Single-lesson fetch for a student, with completion + lock info.
 * Returns null if lesson or its unit isn't published.
 */
export async function getLessonForStudent(
  lessonId: string,
  userId: string
): Promise<{
  lesson: Lesson;
  unit: Unit;
  completed: boolean;
  locked: boolean;
} | null> {
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();
  if (!lesson) return null;

  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("id", lesson.unit_id)
    .eq("published", true)
    .maybeSingle();
  if (!unit) return null;

  const { data: completion } = await supabase
    .from("lesson_completions")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  // Find preceding required lessons in same unit; if any aren't completed, lock this one
  const { data: preceding } = await supabase
    .from("lessons")
    .select("id, completion_required_for_next")
    .eq("unit_id", lesson.unit_id)
    .eq("published", true)
    .lt("order", lesson.order);

  const requiredPrecedingIds =
    preceding?.filter((p) => p.completion_required_for_next).map((p) => p.id) ??
    [];

  let locked = false;
  if (requiredPrecedingIds.length > 0) {
    const { data: completedRequired } = await supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", userId)
      .in("lesson_id", requiredPrecedingIds);
    locked = (completedRequired?.length ?? 0) < requiredPrecedingIds.length;
  }

  return { lesson, unit, completed: !!completion, locked };
}

// =============================================================
// Lesson notes (per-student)
// =============================================================

export type LessonNote = {
  content: string | null;
  updated_at: string | null;
};

/**
 * Fetch a student's personal note for a given lesson.
 * Returns null if they haven't written anything yet.
 *
 * The DB column is `body`; we expose it as `content` to match the
 * component prop name (`initialContent`) and avoid renaming down the line.
 */
export async function getLessonNote(
  lessonId: string,
  userId: string
): Promise<LessonNote | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lesson_notes")
    .select("body, updated_at")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { content: data.body, updated_at: data.updated_at };
}