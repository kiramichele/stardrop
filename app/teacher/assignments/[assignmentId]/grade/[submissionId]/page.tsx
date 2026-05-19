import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getSubmissionForGrading,
  getSubmissionEvents,
  computeLateness,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SubmissionStatusBadge } from "@/components/assignments/Badges";
import { PasteTimeline } from "@/components/assignments/PasteTimeline";
import { GradingForm } from "@/components/assignments/GradingForm";

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>;
}) {
  const { assignmentId, submissionId } = await params;
  const submission = await getSubmissionForGrading(submissionId);
  if (!submission) notFound();

  const events = await getSubmissionEvents(submissionId);

  const student = Array.isArray(submission.users)
    ? submission.users[0]
    : submission.users;
  const assignment = Array.isArray(submission.assignments)
    ? submission.assignments[0]
    : submission.assignments;
  const grade = Array.isArray(submission.grades)
    ? submission.grades[0]
    : submission.grades;

  const { isLate, daysLate } = computeLateness(
    submission.submitted_at,
    assignment?.due_date
  );

  const content = submission.content ?? "";

  return (
    <>
      <Link
        href={`/teacher/assignments/${assignmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {assignment?.title ?? "assignment"}
      </Link>

      <PageHeader
        eyebrow={`${student?.first_name} ${student?.last_name}`}
        title={assignment?.title ?? "Submission"}
        description={
          <span className="inline-flex items-center gap-3 mt-1">
            <SubmissionStatusBadge
              status={submission.status}
              hasGrade={!!grade}
              isLate={isLate}
            />
            <span className="text-sm text-wood-500">
              {submission.submitted_at
                ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}`
                : submission.updated_at
                  ? `Last edited ${new Date(submission.updated_at).toLocaleString()}`
                  : "Not started"}
              {isLate && ` · ${daysLate} day${daysLate === 1 ? "" : "s"} late`}
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code + instructions */}
        <div className="lg:col-span-2 space-y-4">
          {assignment?.instructions && (
            <Card>
              <p className="label-eyebrow mb-2">Instructions</p>
              <p className="text-sm text-wood-700 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </Card>
          )}

          <div>
            <p className="label-eyebrow mb-2">Submission</p>
            {content.trim().length === 0 ? (
              <Card>
                <p className="text-sm text-wood-500 italic text-center py-4">
                  No content submitted yet.
                </p>
              </Card>
            ) : (
              <pre className="bg-cream-50 border border-wood-200 rounded-cozy-lg p-4 overflow-x-auto text-sm font-mono text-wood-900 shadow-cozy">
                {content}
              </pre>
            )}
          </div>
        </div>

        {/* Grading + paste timeline */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Grade this submission
            </h3>
            <GradingForm
              submissionId={submissionId}
              maxPoints={assignment?.points ?? 100}
              initialScore={grade?.score ?? null}
              initialFeedback={grade?.feedback ?? null}
              alreadyGraded={!!grade}
            />
          </Card>

          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Paste tracking
            </h3>
            <PasteTimeline
              events={events}
              totalContentLength={content.length}
            />
          </Card>
        </div>
      </div>
    </>
  );
}