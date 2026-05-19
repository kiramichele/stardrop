import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import {
  getAssignmentForStudent,
  computeLateness,
  type AssignmentType,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import { CodeAssignmentEditor } from "@/components/assignments/CodeAssignmentEditor";
import { InteractiveHtmlAssignment } from "@/components/assignments/InteractiveHtmlAssignment";

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await requireStudent();
  const result = await getAssignmentForStudent(assignmentId, user.id);
  if (!result) notFound();

  const { assignment, submission } = result;
  const grade =
    submission && Array.isArray(submission.grades)
      ? submission.grades[0]
      : submission?.grades;
  const { isLate, daysLate } = computeLateness(
    submission?.submitted_at,
    assignment.due_date
  );

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
    <>
      <Link
        href="/student/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to assignments
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <AssignmentTypeBadge type={assignment.type as AssignmentType} />
            {assignment.points} pts
          </span>
        }
        title={assignment.title}
        description={dueText ? `Due ${dueText}` : undefined}
      />

      {grade && (
        <Card className="mb-6 bg-sage-50 border-sage-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-sage-700" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="font-display text-3xl text-sage-800">
                  {grade.score}
                </p>
                <p className="text-wood-500">/ {assignment.points}</p>
                {isLate && (
                  <p className="text-xs text-terracotta-700 ml-2">
                    Submitted {daysLate}d late
                  </p>
                )}
              </div>
              {grade.feedback && (
                <p className="text-sm text-wood-700 mt-3 whitespace-pre-wrap">
                  <span className="label-eyebrow block mb-1 text-sage-700">
                    Feedback
                  </span>
                  {grade.feedback}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {assignment.type === "code" && (
            <CodeAssignmentEditor
              assignmentId={assignment.id}
              initialContent={submission?.content ?? ""}
              initialStatus={submission?.status ?? "draft"}
              initialSubmissionId={submission?.id ?? null}
            />
          )}

          {assignment.type === "interactive_html" && assignment.interactive_html_url && (
            <InteractiveHtmlAssignment
              assignmentId={assignment.id}
              htmlUrl={assignment.interactive_html_url}
              initialData={submission?.structured_data ?? null}
              initialStatus={submission?.status ?? "draft"}
              initialSubmissionId={submission?.id ?? null}
            />
          )}

          {!["code", "interactive_html"].includes(assignment.type) && (
            <Card>
              <p className="text-sm text-wood-600 text-center py-6">
                This assignment type is still being built. Check back soon!
              </p>
            </Card>
          )}
        </div>

        <div>
          {assignment.instructions ? (
            <Card>
              <p className="label-eyebrow mb-2">Instructions</p>
              <p className="text-sm text-wood-700 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-wood-500 italic">
                No instructions provided.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}