import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Eye, MessagesSquare } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import {
  computeLateness,
  parseSubmissionMedia,
  type AssignmentType,
} from "@/lib/assignments";
import {
  getAssignmentForStudent,
  getOtherDiscussionPosts,
} from "@/lib/assignments-server";
import { getFeedbackThread } from "@/lib/feedback-server";
import { FeedbackThread } from "@/components/feedback/FeedbackThread";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import { CodeAssignmentEditor } from "@/components/assignments/CodeAssignmentEditor";
import { InteractiveHtmlAssignment } from "@/components/assignments/InteractiveHtmlAssignment";
import { TextAssignmentEditor } from "@/components/assignments/TextAssignmentEditor";
import { DiscussionFeed } from "@/components/assignments/DiscussionFeed";
import { UnityUploadAssignment } from "@/components/assignments/UnityUploadAssignment";

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

  // For discussions: only fetch others' posts once the current student has submitted
  const hasSubmittedDiscussion =
    assignment.type === "discussion" &&
    (submission?.status === "submitted" || submission?.status === "graded");

  const otherPosts = hasSubmittedDiscussion
    ? await getOtherDiscussionPosts(assignment.id, user.id)
    : [];

  // Only build the feedback thread once graded (initial msg is grades.feedback)
  const isGraded = submission?.status === "graded";
  const feedbackEntries =
    isGraded && submission ? await getFeedbackThread(submission.id) : [];

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
            </div>
          </div>
        </Card>
      )}

      {isGraded && submission && feedbackEntries.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-display text-lg text-wood-900 mb-4">Feedback</h3>
          <FeedbackThread
            submissionId={submission.id}
            entries={feedbackEntries}
            currentUserRole="student"
            canReply={true}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {assignment.type === "code" && (
            <CodeAssignmentEditor
              assignmentId={assignment.id}
              initialContent={submission?.content ?? ""}
              initialStatus={submission?.status ?? "draft"}
              initialSubmissionId={submission?.id ?? null}
            />
          )}

          {assignment.type === "interactive_html" &&
            assignment.interactive_html_url && (
              <InteractiveHtmlAssignment
                assignmentId={assignment.id}
                htmlUrl={assignment.interactive_html_url}
                initialData={submission?.structured_data ?? null}
                initialStatus={submission?.status ?? "draft"}
                initialSubmissionId={submission?.id ?? null}
              />
            )}

          {assignment.type === "short_answer" && (
            <TextAssignmentEditor
              assignmentId={assignment.id}
              initialContent={submission?.content ?? ""}
              initialStatus={submission?.status ?? "draft"}
              initialSubmissionId={submission?.id ?? null}
              minimumWordCount={assignment.minimum_word_count}
              placeholder="Type your answer here…"
            />
          )}

          {assignment.type === "discussion" && (
            <>
              <TextAssignmentEditor
                assignmentId={assignment.id}
                initialContent={submission?.content ?? ""}
                initialStatus={submission?.status ?? "draft"}
                initialSubmissionId={submission?.id ?? null}
                minimumWordCount={assignment.minimum_word_count}
                placeholder="Share your thoughts with the class…"
                visibilityWarning="Your post will be visible to classmates in this section once you submit it."
              />

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MessagesSquare
                    className="w-4 h-4 text-wood-600"
                    strokeWidth={1.75}
                  />
                  <h2 className="font-display text-xl text-wood-800">
                    Classmates&apos; posts
                  </h2>
                  {hasSubmittedDiscussion && (
                    <span className="label-eyebrow text-wood-500">
                      ({otherPosts.length})
                    </span>
                  )}
                </div>

                {!hasSubmittedDiscussion ? (
                  <Card className="bg-cream-100 border-wood-200">
                    <div className="flex items-start gap-3">
                      <Eye
                        className="w-5 h-5 text-wood-500 flex-shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm text-wood-700 font-medium">
                          Submit your post first to see classmates&apos;
                          responses
                        </p>
                        <p className="text-xs text-wood-500 mt-1">
                          This keeps everyone&apos;s thinking original — no
                          peeking until you&apos;ve shared yours.
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <DiscussionFeed posts={otherPosts} />
                )}
              </div>
            </>
          )}

          {assignment.type === "unity_upload" && (
            <UnityUploadAssignment
              assignmentId={assignment.id}
              initialMedia={parseSubmissionMedia(submission?.uploaded_files)}
              initialStatus={submission?.status ?? "draft"}
              initialSubmissionId={submission?.id ?? null}
            />
          )}

          {![
            "code",
            "interactive_html",
            "short_answer",
            "discussion",
            "unity_upload",
          ].includes(assignment.type) && (
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
              {assignment.minimum_word_count &&
                (assignment.type === "short_answer" ||
                  assignment.type === "discussion") && (
                  <p className="text-xs text-honey-700 mt-3 pt-3 border-t border-wood-100">
                    Minimum {assignment.minimum_word_count} words.
                  </p>
                )}
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