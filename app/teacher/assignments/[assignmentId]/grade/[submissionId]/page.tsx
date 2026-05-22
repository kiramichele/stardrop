import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  computeLateness,
  computeAutoGrade,
  countWords,
  parseSubmissionMedia,
  type AssignmentType,
} from "@/lib/assignments";
import {
  getSubmissionForGrading,
  getSubmissionEvents,
  getSubmissionsForAssignment,
} from "@/lib/assignments-server";
import { getStudentNotes } from "@/lib/students-server";
import { getRubric } from "@/lib/rubrics-server";
import { parseRubricScores } from "@/lib/rubrics";
import { getFeedbackThread } from "@/lib/feedback-server";
import { FeedbackThread } from "@/components/feedback/FeedbackThread";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  KeyboardShortcuts,
  type Shortcut,
} from "@/components/ui/KeyboardShortcuts";
import { SubmissionStatusBadge } from "@/components/assignments/Badges";
import { PasteTimeline } from "@/components/assignments/PasteTimeline";
import { GradingForm } from "@/components/assignments/GradingForm";
import { GradingNav } from "@/components/assignments/GradingNav";
import { InteractiveResponseView } from "@/components/assignments/InteractiveResponseView";
import { StudentNoteCallout } from "@/components/students/StudentNoteCallout";

const GRADING_SHORTCUTS: Shortcut[] = [
  { keys: ["J"], label: "Go to the next submission" },
  { keys: ["K"], label: "Go to the previous submission" },
  { keys: ["Ctrl", "S"], label: "Save this grade" },
  { keys: ["Ctrl", "Enter"], label: "Save grade & jump to next ungraded" },
  { keys: ["?"], label: "Open this shortcuts list" },
  { keys: ["Esc"], label: "Close this list" },
];

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ assignmentId: string; submissionId: string }>;
}) {
  const { assignmentId, submissionId } = await params;
  const [submission, queue] = await Promise.all([
    getSubmissionForGrading(submissionId),
    getSubmissionsForAssignment(assignmentId),
  ]);
  if (!submission) notFound();

  // Submission queue — drives j / k navigation and "Save & grade next".
  // `queue` is ordered newest-submitted first, matching the assignment page.
  const queueIds = queue.map((s) => s.id);
  const currentIndex = queueIds.indexOf(submissionId);
  const prevId = currentIndex > 0 ? queueIds[currentIndex - 1] : null;
  const nextId =
    currentIndex >= 0 && currentIndex < queueIds.length - 1
      ? queueIds[currentIndex + 1]
      : null;
  const gradedCount = queue.filter((s) => s.status === "graded").length;

  // First submission still awaiting a grade — scan forward, wrapping once.
  let nextUngradedId: string | null = null;
  if (currentIndex >= 0) {
    for (let step = 1; step <= queue.length; step++) {
      const candidate = queue[(currentIndex + step) % queue.length];
      if (candidate.id === submissionId) break;
      if (candidate.status === "submitted") {
        nextUngradedId = candidate.id;
        break;
      }
    }
  }

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

  const assignmentType = assignment?.type as AssignmentType | undefined;
  const content = submission.content ?? "";
  const structuredData = submission.structured_data;

  const showPasteTimeline = assignmentType === "code";
  const events = showPasteTimeline ? await getSubmissionEvents(submissionId) : [];

  const autoGrade =
    assignmentType === "interactive_html"
      ? computeAutoGrade(structuredData, assignment?.points ?? 100)
      : null;

  const rubric = assignment?.rubric_id
    ? await getRubric(assignment.rubric_id)
    : null;
  const initialRubricScores = parseRubricScores(grade?.rubric_scores);

  const feedbackEntries = await getFeedbackThread(submissionId);
  const studentNotes = await getStudentNotes(submission.user_id);

  const isTextual =
    assignmentType === "short_answer" || assignmentType === "discussion";
  const wordCount = isTextual ? countWords(content) : 0;
  const meetsMinimum =
    !assignment?.minimum_word_count ||
    wordCount >= assignment.minimum_word_count;

  return (
    <>
      <Link
        href={`/teacher/assignments/${assignmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {assignment?.title ?? "assignment"}
      </Link>

      <GradingNav
        assignmentId={assignmentId}
        prevId={prevId}
        nextId={nextId}
        position={{
          index: currentIndex + 1,
          total: queue.length,
          graded: gradedCount,
        }}
      />

      <PageHeader
        eyebrow={`${student?.first_name} ${student?.last_name}`}
        title={assignment?.title ?? "Submission"}
        action={<KeyboardShortcuts shortcuts={GRADING_SHORTCUTS} />}
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

      <StudentNoteCallout notes={studentNotes} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {assignment?.instructions && (
            <Card>
              <p className="label-eyebrow mb-2">Instructions</p>
              <p className="text-sm text-wood-700 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </Card>
          )}

          {assignmentType === "code" && (
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
          )}

          {assignmentType === "interactive_html" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="label-eyebrow">Responses</p>
                {assignment?.interactive_html_url && (
                  <a
                    href={assignment.interactive_html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-terracotta-700 hover:text-terracotta-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View the activity
                  </a>
                )}
              </div>
              {!structuredData ? (
                <Card>
                  <p className="text-sm text-wood-500 italic text-center py-4">
                    Student hasn&apos;t saved any data yet.
                  </p>
                </Card>
              ) : (
                <InteractiveResponseView structuredData={structuredData} />
              )}
            </div>
          )}

          {assignmentType === "unity_upload" && (
            <div>
              <p className="label-eyebrow mb-3">Uploaded files</p>
              {(() => {
                const files = parseSubmissionMedia(submission.uploaded_files);
                if (files.length === 0) {
                  return (
                    <Card>
                      <p className="text-sm text-wood-500 italic text-center py-4">
                        No files submitted yet.
                      </p>
                    </Card>
                  );
                }
                return (
                  <div className="space-y-3">
                    {files.map((m) => {
                      const url = `/api/files/submissions/${m.storagePath}`;
                      return (
                        <Card key={m.id} padded={false} className="overflow-hidden">
                          {m.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt=""
                              className="w-full max-h-[600px] object-contain bg-cream-50"
                            />
                          ) : (
                            <video
                              src={url}
                              controls
                              className="w-full max-h-[600px] bg-black"
                            />
                          )}
                          <div className="px-4 py-2 flex items-center justify-between text-xs text-wood-500">
                            <span className="capitalize">
                              {m.kind} · {(m.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-terracotta-700 hover:text-terracotta-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in new tab
                            </a>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {isTextual && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label-eyebrow">
                  {assignmentType === "discussion" ? "Their post" : "Their answer"}
                </p>
                <p className="text-xs text-wood-500">
                  <span
                    className={
                      assignment?.minimum_word_count && !meetsMinimum
                        ? "text-honey-700 font-medium"
                        : ""
                    }
                  >
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                  </span>
                  {assignment?.minimum_word_count && (
                    <span className="text-wood-400">
                      {" "}
                      / min {assignment.minimum_word_count}
                    </span>
                  )}
                </p>
              </div>
              {content.trim().length === 0 ? (
                <Card>
                  <p className="text-sm text-wood-500 italic text-center py-4">
                    No content submitted yet.
                  </p>
                </Card>
              ) : (
                <Card>
                  <p className="text-base text-wood-900 whitespace-pre-wrap leading-relaxed">
                    {content}
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Grade this submission
            </h3>
            <GradingForm
              submissionId={submissionId}
              assignmentId={assignmentId}
              nextUngradedId={nextUngradedId}
              maxPoints={assignment?.points ?? 100}
              initialScore={grade?.score ?? null}
              initialFeedback={grade?.feedback ?? null}
              alreadyGraded={!!grade}
              autoGrade={autoGrade}
              rubric={rubric}
              initialRubricScores={initialRubricScores}
            />
          </Card>

          {feedbackEntries.length > 0 && (
            <Card>
              <h3 className="font-display text-lg text-wood-900 mb-4">
                Feedback thread
              </h3>
              <FeedbackThread
                submissionId={submissionId}
                entries={feedbackEntries}
                currentUserRole="teacher"
                canReply={true}
              />
            </Card>
          )}

          {showPasteTimeline && (
            <Card>
              <h3 className="font-display text-lg text-wood-900 mb-4">
                Paste tracking
              </h3>
              <PasteTimeline
                events={events}
                totalContentLength={content.length}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}