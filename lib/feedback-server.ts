import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile } from "@/lib/profile";
import type { FeedbackEntry } from "@/lib/feedback";

/**
 * Build the feedback thread for a submission.
 *
 * Composition:
 *   - First entry (if any) = the teacher's grades.feedback text, attributed
 *     to the first teacher account in the system.
 *   - Remaining entries = rows from feedback_messages, oldest first.
 *
 * Uses the admin client so a student can see their own thread regardless
 * of RLS. The calling page gates access (student must own the submission).
 */
export async function getFeedbackThread(
  submissionId: string
): Promise<FeedbackEntry[]> {
  const admin = createAdminClient();

  const [{ data: grade }, { data: messages }] = await Promise.all([
    admin
      .from("grades")
      .select("feedback, graded_at")
      .eq("submission_id", submissionId)
      .maybeSingle(),
    admin
      .from("feedback_messages")
      .select(
        "id, author_id, body, created_at, users(first_name, last_name, role, avatar_url)"
      )
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true }),
  ]);

  const entries: FeedbackEntry[] = [];

  if (grade?.feedback && grade.feedback.trim().length > 0) {
    const { data: teachers } = await admin
      .from("users")
      .select("*")
      .eq("role", "teacher")
      .limit(1);
    const t = teachers?.[0] ? asProfile(teachers[0]) : null;
    entries.push({
      id: `initial:${submissionId}`,
      source: "initial",
      authorRole: "teacher",
      authorFirstName: t?.first_name ?? "Teacher",
      authorLastName: t?.last_name ?? "",
      authorAvatarUrl: t?.avatar_url ?? null,
      body: grade.feedback,
      createdAt: grade.graded_at ?? new Date(0).toISOString(),
    });
  }

  for (const m of messages ?? []) {
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    entries.push({
      id: m.id,
      source: "reply",
      authorRole: user?.role === "teacher" ? "teacher" : "student",
      authorFirstName: user?.first_name ?? "Removed",
      authorLastName: user?.last_name ?? "user",
      authorAvatarUrl: user?.avatar_url ?? null,
      body: m.body,
      createdAt: m.created_at,
    });
  }

  return entries;
}
