import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getStudentOverview } from "@/lib/students-server";
import { letterGrade, type AssignmentType } from "@/lib/assignments";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import { ExcuseToggle } from "@/components/students/ExcuseToggle";

export default async function StudentOverviewPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireTeacher();
  const { studentId } = await params;
  const overview = await getStudentOverview(studentId);
  if (!overview) notFound();

  const {
    student,
    classes,
    grades,
    lessonsCompleted,
    lessonsTotal,
    discussionPosts,
  } = overview;

  // Excused work is dropped from the average entirely.
  const graded = grades.filter((g) => g.score !== null && !g.excused);
  const earned = graded.reduce((s, g) => s + (g.score ?? 0), 0);
  const possible = graded.reduce((s, g) => s + g.points, 0);
  const averagePct = possible > 0 ? (earned / possible) * 100 : null;
  const awaitingGrade = grades.filter(
    (g) => g.status === "submitted" && !g.excused
  ).length;

  const fullName =
    `${student.first_name} ${student.last_name}`.trim() || student.username;
  const backHref = classes[0]
    ? `/teacher/classes/${classes[0].id}`
    : "/teacher/classes";
  const backLabel = classes[0]
    ? `Back to ${classes[0].name}`
    : "Back to classes";

  return (
    <>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </Link>

      {/* Profile */}
      <Card className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar
            firstName={student.first_name}
            lastName={student.last_name}
            avatarUrl={student.avatar_url}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="label-eyebrow">Student</p>
            <h1 className="font-display text-3xl text-wood-900 leading-tight">
              {fullName}
            </h1>
            <p className="text-sm text-wood-500 mt-1">
              <span className="font-mono">{student.username}</span>
              {student.real_email && (
                <>
                  <span className="text-wood-300 mx-1.5">·</span>
                  {student.real_email}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {classes.length === 0 ? (
                <span className="text-xs text-wood-500 italic">
                  Not enrolled in any class
                </span>
              ) : (
                classes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/teacher/classes/${c.id}`}
                    className="text-xs font-medium px-2 py-0.5 rounded-full bg-cream-200 text-wood-700 hover:bg-cream-300 transition-colors"
                  >
                    {c.name}
                    {c.periodNumber != null && ` · Period ${c.periodNumber}`}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="bg-sage-50 border-sage-200">
          <p className="label-eyebrow text-sage-700">Average</p>
          {averagePct === null ? (
            <p className="font-display text-2xl text-wood-600 mt-1">—</p>
          ) : (
            <p className="font-display text-3xl text-sage-800 mt-0.5 leading-none">
              {averagePct.toFixed(0)}%
              <span className="text-lg text-sage-600 ml-1.5">
                {letterGrade(averagePct)}
              </span>
            </p>
          )}
          <p className="text-xs text-wood-500 mt-1">
            {graded.length} of {grades.length} graded
          </p>
        </Card>

        <Card
          className={
            awaitingGrade > 0 ? "bg-honey-50 border-honey-200" : undefined
          }
        >
          <p
            className={[
              "label-eyebrow",
              awaitingGrade > 0 ? "text-honey-700" : "",
            ].join(" ")}
          >
            Awaiting grade
          </p>
          <p className="font-display text-3xl text-wood-900 mt-0.5 leading-none">
            {awaitingGrade}
          </p>
          <p className="text-xs text-wood-500 mt-1">
            {awaitingGrade === 1 ? "submission" : "submissions"}
          </p>
        </Card>

        <Card>
          <p className="label-eyebrow">Lessons done</p>
          <p className="font-display text-3xl text-wood-900 mt-0.5 leading-none">
            {lessonsCompleted}
            <span className="text-lg text-wood-400">/{lessonsTotal}</span>
          </p>
          <p className="text-xs text-wood-500 mt-1">completed</p>
        </Card>

        <Card>
          <p className="label-eyebrow">Discussion</p>
          <p className="font-display text-3xl text-wood-900 mt-0.5 leading-none">
            {discussionPosts}
          </p>
          <p className="text-xs text-wood-500 mt-1">
            {discussionPosts === 1 ? "post" : "posts"}
          </p>
        </Card>
      </div>

      {/* Work & grades */}
      <h2 className="font-display text-xl text-wood-800 mb-3">Work &amp; grades</h2>
      {grades.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Once assignments are published for this student's class, their work shows up here."
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {grades.map((g) => {
              const pct =
                g.score !== null && g.points > 0
                  ? (g.score / g.points) * 100
                  : null;
              const href = g.submissionId
                ? `/teacher/assignments/${g.assignmentId}/grade/${g.submissionId}`
                : `/teacher/assignments/${g.assignmentId}`;
              return (
                <li
                  key={g.assignmentId}
                  className={[
                    "flex items-center gap-1 p-1.5",
                    g.excused ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <Link
                    href={href}
                    className="group flex-1 min-w-0 flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-wood-900 truncate">
                          {g.title}
                        </p>
                        <AssignmentTypeBadge type={g.type as AssignmentType} />
                      </div>
                      <p className="text-xs text-wood-500">
                        {g.dueDate
                          ? `Due ${new Date(g.dueDate).toLocaleDateString()}`
                          : "No due date"}
                      </p>
                    </div>
                    {g.excused ? (
                      <p className="text-xs font-medium text-wood-500 flex-shrink-0">
                        Excused
                      </p>
                    ) : g.score !== null ? (
                      <div className="text-right flex-shrink-0">
                        <p className="font-display text-lg text-sage-700">
                          {g.score}
                          <span className="text-wood-400 text-sm font-normal">
                            /{g.points}
                          </span>
                        </p>
                        {pct !== null && (
                          <p className="text-xs text-wood-500">
                            {pct.toFixed(0)}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-wood-500 flex-shrink-0">
                        {g.status === "submitted"
                          ? "Submitted — needs grading"
                          : g.status === "draft"
                            ? "In progress"
                            : "Not started"}
                      </p>
                    )}
                    <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
                  </Link>
                  <ExcuseToggle
                    assignmentId={g.assignmentId}
                    studentId={studentId}
                    initialExcused={g.excused}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
