import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentStats } from "@/lib/achievements";

// Teacher- and student-facing: derives a student's achievement stats live
// from existing data (submissions, lessons, discussion posts). There's no
// achievements table — badges are computed, never stored.

/** Supabase embeds can come back as an object or a one-element array. */
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

/** Longest run of consecutive calendar days in a set of YYYY-MM-DD strings. */
function longestRun(days: string[]): number {
  if (days.length === 0) return 0;
  const sorted = [...new Set(days)].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(`${sorted[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${sorted[i]}T00:00:00Z`);
    const dayDiff = Math.round((curr - prev) / 86_400_000);
    if (dayDiff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (dayDiff > 1) {
      current = 1;
    }
  }
  return longest;
}

/**
 * Gather everything the achievement badges need for one student. Uses the
 * admin client — callers are requireStudent()/requireTeacher()-gated and
 * pass an explicit user id.
 */
export async function getStudentAchievementStats(
  userId: string
): Promise<StudentStats> {
  const admin = createAdminClient();

  const [subsRes, completionsRes, postsRes, lessonsRes] = await Promise.all([
    admin
      .from("submissions")
      .select(
        "content, status, submitted_at, created_at, updated_at, assignments(type, points), grades(score)"
      )
      .eq("user_id", userId),
    admin
      .from("lesson_completions")
      .select("lesson_id, completed_at")
      .eq("user_id", userId),
    admin
      .from("discussion_posts")
      .select("created_at")
      .eq("user_id", userId)
      .is("deleted_at", null),
    admin.from("lessons").select("id, unit_id").eq("published", true),
  ]);

  const subs = subsRes.data ?? [];
  const completions = completionsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const lessons = lessonsRes.data ?? [];

  // --- Submissions, code volume, and grades -------------------------------
  let submissions = 0;
  let linesOfCode = 0;
  let perfectScores = 0;
  let gradedCount = 0;
  let pctSum = 0;

  for (const s of subs) {
    if (s.status === "submitted" || s.status === "graded") submissions += 1;

    const assignment = one(s.assignments);
    const grade = one(s.grades);

    if (assignment?.type === "code" && s.content) {
      linesOfCode += s.content
        .split("\n")
        .filter((line) => line.trim().length > 0).length;
    }

    if (
      grade &&
      typeof grade.score === "number" &&
      assignment &&
      assignment.points > 0
    ) {
      gradedCount += 1;
      pctSum += (grade.score / assignment.points) * 100;
      if (grade.score >= assignment.points) perfectScores += 1;
    }
  }

  const averagePct = gradedCount > 0 ? Math.round(pctSum / gradedCount) : 0;

  // --- Units cleared (every published lesson in the unit done) ------------
  const completedLessonIds = new Set(completions.map((c) => c.lesson_id));
  const byUnit = new Map<string, { total: number; done: number }>();
  for (const l of lessons) {
    const u = byUnit.get(l.unit_id) ?? { total: 0, done: 0 };
    u.total += 1;
    if (completedLessonIds.has(l.id)) u.done += 1;
    byUnit.set(l.unit_id, u);
  }
  let unitsCleared = 0;
  for (const u of byUnit.values()) {
    if (u.total > 0 && u.done >= u.total) unitsCleared += 1;
  }

  // --- Activity streak ----------------------------------------------------
  const activeDays: string[] = [];
  for (const s of subs) {
    const stamp = s.submitted_at ?? s.updated_at ?? s.created_at;
    if (stamp) activeDays.push(stamp.slice(0, 10));
  }
  for (const c of completions) {
    if (c.completed_at) activeDays.push(c.completed_at.slice(0, 10));
  }
  for (const p of posts) {
    if (p.created_at) activeDays.push(p.created_at.slice(0, 10));
  }

  return {
    submissions,
    linesOfCode,
    lessonsCompleted: completions.length,
    unitsCleared,
    longestStreak: longestRun(activeDays),
    perfectScores,
    averagePct,
    gradedCount,
    discussionPosts: posts.length,
  };
}
