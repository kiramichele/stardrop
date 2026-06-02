import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MessagesSquare, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import {
  findDemoStudent,
  DEMO_ASSIGNMENTS,
  DEMO_CLASS,
  DEMO_LESSON_TOTAL,
  DEMO_DISCUSSION,
  DEMO_VIEWER_STUDENT,
} from "@/lib/demo/fixtures";

type GradeRow = {
  id: string;
  title: string;
  type: (typeof DEMO_ASSIGNMENTS)[number]["type"];
  points: number;
  status: "graded" | "submitted" | "missing" | null;
  score: number | null;
};

// Builds a believable, deterministic grade sheet for one demo student from
// their average and missing count — no database involved.
function buildGrades(
  averagePct: number | null,
  missingCount: number,
  isViewer: boolean
): GradeRow[] {
  const published = DEMO_ASSIGNMENTS.filter((a) => a.published);

  return published.map((a, idx) => {
    if (isViewer) {
      const v = a.viewer;
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        points: a.points,
        status:
          v.status === "graded"
            ? "graded"
            : v.status === "submitted"
              ? "submitted"
              : v.status === "draft"
                ? null
                : null,
        score: v.score,
      };
    }

    // The last `missingCount` assignments read as missing.
    const isMissing = idx >= published.length - missingCount;
    if (averagePct === null || isMissing) {
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        points: a.points,
        status: isMissing ? "missing" : null,
        score: null,
      };
    }

    return {
      id: a.id,
      title: a.title,
      type: a.type,
      points: a.points,
      status: "graded",
      score: Math.round((a.points * averagePct) / 100),
    };
  });
}

export default async function DemoStudentRecord({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = findDemoStudent(studentId);
  if (!student) notFound();

  const isViewer = student.id === DEMO_VIEWER_STUDENT.id;
  const grades = buildGrades(student.averagePct, student.missingCount, isViewer);
  const discussionPosts =
    DEMO_DISCUSSION.posts.filter((p) => p.authorId === student.id).length +
    DEMO_DISCUSSION.posts.reduce(
      (n, p) =>
        n +
        p.replies.filter(
          (r) => r.authorName === `${student.firstName} ${student.lastName}`
        ).length,
      0
    );

  return (
    <>
      <Link
        href="/demo/teacher/students"
        className="inline-flex items-center gap-1.5 text-sm text-wood-500 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to roster
      </Link>

      <div className="flex items-center gap-5 mb-8">
        <Avatar
          firstName={student.firstName}
          lastName={student.lastName}
          avatarUrl={student.avatarUrl}
          size="lg"
        />
        <div>
          <h1 className="font-display text-3xl text-wood-900 leading-tight">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-wood-500 font-mono text-sm mt-1">
            {student.username}
          </p>
          <p className="text-wood-600 text-sm mt-1">
            {DEMO_CLASS.name} · Period {DEMO_CLASS.periodNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <p className="label-eyebrow">Average</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {student.averagePct === null ? "—" : `${student.averagePct}%`}
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 label-eyebrow">
            <BookOpen className="w-3.5 h-3.5" /> Lessons
          </div>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {student.lessonsCompleted}
            <span className="text-base text-wood-400">/{DEMO_LESSON_TOTAL}</span>
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 label-eyebrow">
            <MessagesSquare className="w-3.5 h-3.5" /> Discussion posts
          </div>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {discussionPosts}
          </p>
        </Card>
      </div>

      {student.missingCount > 0 && (
        <Card className="mb-6 bg-honey-50 border-honey-200">
          <div className="flex items-start gap-3">
            <StickyNote
              className="w-5 h-5 text-honey-700 flex-shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
            <div>
              <p className="font-medium text-wood-900">Pinned reminder</p>
              <p className="text-sm text-wood-600 mt-0.5">
                {student.missingCount} missing{" "}
                {student.missingCount === 1 ? "assignment" : "assignments"} —
                check in during follow-up time this week.
              </p>
            </div>
          </div>
        </Card>
      )}

      <h2 className="font-display text-xl text-wood-800 mb-3">Grades</h2>
      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-wood-100">
          {grades.map((g) => {
            const pct =
              g.status === "graded" && g.score !== null && g.points > 0
                ? (g.score / g.points) * 100
                : null;
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-wood-900 truncate">
                      {g.title}
                    </p>
                    <AssignmentTypeBadge type={g.type} />
                  </div>
                </div>
                {g.status === "graded" ? (
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg text-sage-700">
                      {g.score}
                      <span className="text-wood-400 text-sm font-normal">
                        /{g.points}
                      </span>
                    </p>
                    {pct !== null && (
                      <p className="text-xs text-wood-500">{pct.toFixed(0)}%</p>
                    )}
                  </div>
                ) : g.status === "submitted" ? (
                  <p className="text-xs font-medium text-sage-700 flex-shrink-0">
                    Submitted — not graded
                  </p>
                ) : g.status === "missing" ? (
                  <span className="flex-shrink-0 text-[0.65rem] font-semibold text-terracotta-800 bg-terracotta-100 border border-terracotta-200 rounded px-1.5 py-0.5">
                    Missing
                  </span>
                ) : (
                  <p className="text-xs text-wood-400 flex-shrink-0">
                    Not started
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
