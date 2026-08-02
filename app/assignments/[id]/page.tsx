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
    const base =
      user.role === "teacher" ? "/teacher/assignments" : "/student/assignments";
    redirect(`${base}/${id}`);
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

        <div className="rounded-cozy-lg border border-wood-100 bg-white shadow-cozy p-5">
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
          <div className="mt-5 rounded-cozy-lg border border-wood-100 bg-white shadow-cozy overflow-hidden">
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
