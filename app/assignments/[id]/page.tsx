import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { LogIn } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import type { AssignmentType } from "@/lib/assignments";

// Public, shareable assignment link — the URL teachers paste into Canvas.
// Signed-in users are routed to their role's full view (where they can turn it
// in). Everyone else sees the directions read-only with a prompt to log in.
// Only PUBLISHED assignments are exposed; anything else 404s.

const getPublicAssignment = cache(async function getPublicAssignment(
  id: string
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignments")
    .select(
      "id, title, type, instructions, points, due_date, interactive_html_url, published"
    )
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  return data;
});

/**
 * Given the assignment id from a shared link and a student, return the id of
 * the copy in one of the student's own classes (assignments are one copy per
 * class, grouped by assignment_group_id). Falls back to the original id when
 * the student's class has no copy — that page will show its own not-available
 * state.
 */
async function resolveStudentCopyId(
  assignmentId: string,
  userId: string
): Promise<string> {
  const admin = createAdminClient();

  const { data: a } = await admin
    .from("assignments")
    .select("id, class_id, assignment_group_id, title, type, lesson_id, is_unit_quiz")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return assignmentId;

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("class_id")
    .eq("user_id", userId);
  const classIds = (enrollments ?? []).map((e) => e.class_id);
  if (classIds.length === 0) return assignmentId;

  // Link already points at one of the student's classes.
  if (classIds.includes(a.class_id)) return assignmentId;

  // Find the sibling copy in a class the student is in.
  let q = admin
    .from("assignments")
    .select("id")
    .in("class_id", classIds)
    .eq("published", true);
  if (a.assignment_group_id) {
    q = q.eq("assignment_group_id", a.assignment_group_id);
  } else {
    q = q
      .eq("title", a.title)
      .eq("type", a.type)
      .eq("is_unit_quiz", a.is_unit_quiz);
    q = a.lesson_id ? q.eq("lesson_id", a.lesson_id) : q.is("lesson_id", null);
  }
  const { data: sibling } = await q.limit(1).maybeSingle();
  return sibling?.id ?? assignmentId;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await getPublicAssignment(id);
  return { title: a ? `${a.title} · Stardrop` : "Assignment · Stardrop" };
}

export default async function AssignmentLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Signed in → send them to the view where they can actually work/grade.
  if (user) {
    if (user.role === "teacher") {
      redirect(`/teacher/assignments/${id}`);
    }
    // A shared/Canvas link points at one class's copy, but every period gets
    // the same link. Route each student to THEIR class's copy so it opens.
    const targetId = await resolveStudentCopyId(id, user.id);
    redirect(`/student/assignments/${targetId}`);
  }

  // Signed out → read-only directions.
  const assignment = await getPublicAssignment(id);
  if (!assignment) notFound();

  const loginHref = `/login?next=${encodeURIComponent(`/assignments/${id}`)}`;
  const dueText = assignment.due_date
    ? new Date(assignment.due_date).toLocaleString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-cream-100 bg-paper bg-repeat">
      <header className="border-b border-wood-100 bg-cream-50 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-lg text-terracotta-700 leading-none">
              Stardrop
            </span>
            <span className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold">
              Game Design
            </span>
          </p>
          <Link
            href={loginHref}
            className="inline-flex items-center gap-1.5 rounded-cozy bg-terracotta-500 text-white text-sm font-medium px-3.5 py-1.5 hover:bg-terracotta-600 transition-colors"
          >
            <LogIn className="w-4 h-4" strokeWidth={2} />
            Log in to turn this in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        <p className="label-eyebrow text-wood-500 inline-flex items-center gap-2">
          <AssignmentTypeBadge type={assignment.type as AssignmentType} />
          {assignment.points} pts
          {dueText && (
            <>
              <span className="text-wood-300">·</span>
              <span className="normal-case tracking-normal font-normal">
                Due {dueText}
              </span>
            </>
          )}
        </p>
        <h1 className="font-display text-3xl text-wood-900 leading-tight mt-2 mb-5">
          {assignment.title}
        </h1>

        <div className="rounded-cozy-lg border border-wood-100 bg-cream-50 shadow-cozy p-5">
          <p className="label-eyebrow mb-2">Directions</p>
          {assignment.instructions ? (
            <p className="text-sm text-wood-700 whitespace-pre-wrap leading-relaxed">
              {assignment.instructions}
            </p>
          ) : (
            <p className="text-sm text-wood-500 italic">
              No written directions for this assignment.
            </p>
          )}
        </div>

        {assignment.interactive_html_url && (
          <div className="mt-5 rounded-cozy-lg border border-wood-100 bg-cream-50 shadow-cozy overflow-hidden">
            <iframe
              src={assignment.interactive_html_url}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              className="w-full block border-0 bg-white"
              style={{ height: "70vh" }}
              title={`${assignment.title} — activity`}
            />
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-cozy-lg border border-terracotta-200 bg-terracotta-50/60 px-4 py-3">
          <p className="text-sm text-wood-700 flex-1">
            You&apos;re viewing this without signing in. To complete and turn it
            in, log in to your Stardrop account.
          </p>
          <Link
            href={loginHref}
            className="inline-flex items-center gap-1.5 rounded-cozy bg-terracotta-500 text-white text-sm font-medium px-3.5 py-1.5 hover:bg-terracotta-600 transition-colors flex-shrink-0"
          >
            <LogIn className="w-4 h-4" strokeWidth={2} />
            Log in to turn this in
          </Link>
        </div>
      </main>
    </div>
  );
}
