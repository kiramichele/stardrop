import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Users,
  FileCode2,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  computeLateness,
  effectiveDueDate,
  type AssignmentType,
} from "@/lib/assignments";
import {
  getAssignment,
  getSubmissionsForAssignment,
  getAssignmentClassPublishStates,
} from "@/lib/assignments-server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isLimitedStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShareLink } from "@/components/ui/ShareLink";
import { Input } from "@/components/ui/Input";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import { CopyToClassPanel } from "@/components/assignments/CopyToClassPanel";
import { PublishToClassesPanel } from "@/components/assignments/PublishToClassesPanel";
import {
  BulkGradePanel,
  type BulkSubmissionRow,
} from "@/components/assignments/BulkGradePanel";
import { PeerReviewManager } from "@/components/peer-review/PeerReviewManager";
import { getTeacherPeerReview } from "@/lib/peer-review-server";
import { getRubricsForTeacher } from "@/lib/rubrics-server";
import { getUnitsForTeacher } from "@/lib/lessons";
import { AssignmentSettingsForm } from "@/components/assignments/AssignmentSettingsForm";
import { GroupManager } from "@/components/assignments/GroupManager";
import { readCollabConfig } from "@/lib/groups";
import {
  getAssignmentGroups,
  getEnrolledStudents,
} from "@/lib/groups-server";
import { deleteAssignment, uploadInteractiveHtml } from "../actions";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = await getAssignment(assignmentId);
  if (!assignment) notFound();

  // Limited-staff (e.g. assistant principal): read-only view of the
  // assignment itself — no submissions, grades, settings, or edit controls.
  const me = await getCurrentUser();
  if (isLimitedStaff(me)) {
    const roKlass = Array.isArray(assignment.classes)
      ? assignment.classes[0]
      : assignment.classes;
    return (
      <>
        <Link
          href="/teacher/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to assignments
        </Link>
        <PageHeader
          eyebrow={roKlass?.name ?? "Assignment"}
          title={assignment.title}
          description={
            <span className="inline-flex items-center gap-2 mt-1">
              <AssignmentTypeBadge type={assignment.type as AssignmentType} />
              <span className="text-sm text-wood-500">
                {assignment.points} pts
                {assignment.due_date &&
                  ` · due ${new Date(assignment.due_date).toLocaleString()}`}
              </span>
            </span>
          }
        />
        <Card>
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
        </Card>
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
      </>
    );
  }

  const isPeerReview = (assignment.type as AssignmentType) === "peer_review";
  const peerData = isPeerReview
    ? await getTeacherPeerReview(assignmentId)
    : null;

  const submissions = await getSubmissionsForAssignment(assignmentId);
  const rubrics = await getRubricsForTeacher();
  const publishStates = await getAssignmentClassPublishStates(assignment);
  const klass = Array.isArray(assignment.classes)
    ? assignment.classes[0]
    : assignment.classes;

  // Other classes this assignment could be copied into.
  const supabase = await createClient();
  const { data: allClasses } = await supabase
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });
  const otherClasses = (allClasses ?? [])
    .filter((c) => c.id !== assignment.class_id)
    .map((c) => ({
      id: c.id,
      name:
        c.period_number != null
          ? `${c.name} · Period ${c.period_number}`
          : c.name,
    }));

  const units = (await getUnitsForTeacher()).map((u) => ({
    id: u.id,
    title: u.title,
    lessons: u.lessons.map((l) => ({ id: l.id, title: l.title })),
  }));

  const deleteAction = deleteAssignment.bind(null, assignmentId);
  const uploadHtmlAction = uploadInteractiveHtml.bind(null, assignmentId);

  const dueLocal = assignment.due_date
    ? new Date(assignment.due_date).toISOString().slice(0, 16)
    : "";
  const due1_5xLocal = assignment.due_date_1_5x
    ? new Date(assignment.due_date_1_5x).toISOString().slice(0, 16)
    : "";
  const due2xLocal = assignment.due_date_2x
    ? new Date(assignment.due_date_2x).toISOString().slice(0, 16)
    : "";

  const submittedCount = submissions.filter(
    (s) => s.status === "submitted" || s.status === "graded"
  ).length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  const submissionRows: BulkSubmissionRow[] = submissions.map((s) => {
    const student = Array.isArray(s.users) ? s.users[0] : s.users;
    const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
    const { isLate, daysLate } = computeLateness(
      s.submitted_at,
      effectiveDueDate(assignment, student?.extended_time)
    );
    const whenLabel = s.submitted_at
      ? `Submitted ${new Date(s.submitted_at).toLocaleString()}`
      : s.updated_at
        ? `Last edited ${new Date(s.updated_at).toLocaleString()}`
        : "Not started";
    return {
      id: s.id,
      studentId: s.user_id,
      studentName:
        `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() ||
        "Unknown student",
      status: s.status,
      score: grade?.score ?? null,
      hasGrade: !!grade,
      isLate,
      daysLate,
      whenLabel,
    };
  });

  const isInteractive = assignment.type === "interactive_html";
  const isTextual =
    assignment.type === "short_answer" || assignment.type === "discussion";
  const isCode = assignment.type === "code";
  // Devlog + video_response + code assignments also use the
  // interactive_html_url column — for them it's an optional rich-HTML
  // prompt rendered above the recorder / editor.
  const isDevlog = (assignment.type as AssignmentType) === "devlog";
  const isVideoResponse =
    (assignment.type as AssignmentType) === "video_response";
  const acceptsHtml = isInteractive || isDevlog || isVideoResponse || isCode;
  const hasInteractiveHtml = !!assignment.interactive_html_url;
  const collabConfig = readCollabConfig(assignment);
  // Legacy "both" rows collapse to "unity" — the form no longer offers a
  // "both" option.
  const storedCodeRunMode = (assignment as { code_run_mode?: string })
    .code_run_mode;
  const resolvedCodeRunMode =
    !storedCodeRunMode || storedCodeRunMode === "both"
      ? "unity"
      : storedCodeRunMode;
  const autoPublishToStarhub = Boolean(
    (assignment as { auto_publish_to_starhub?: boolean })
      .auto_publish_to_starhub
  );

  const [groups, roster] = collabConfig.collaborative
    ? await Promise.all([
        getAssignmentGroups(assignmentId),
        getEnrolledStudents(assignment.class_id),
      ])
    : [[], []];

  return (
    <>
      <Link
        href="/teacher/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to assignments
      </Link>

      <PageHeader
        eyebrow={klass?.name ?? "Assignment"}
        title={assignment.title}
        description={
          <span className="inline-flex items-center gap-2 mt-1">
            <AssignmentTypeBadge type={assignment.type as AssignmentType} />
            <span className="text-sm text-wood-500">
              {assignment.points} pts
              {assignment.due_date &&
                ` · due ${new Date(assignment.due_date).toLocaleString()}`}
              {assignment.minimum_word_count &&
                isTextual &&
                ` · min ${assignment.minimum_word_count} words`}
            </span>
          </span>
        }
      />

      {isInteractive && !hasInteractiveHtml && (
        <Card className="mb-6 bg-honey-50 border-honey-200">
          <div className="flex items-start gap-3">
            <FileCode2
              className="w-5 h-5 text-honey-700 flex-shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
            <div>
              <p className="font-display text-base text-honey-900">
                Upload the interactive HTML file
              </p>
              <p className="text-sm text-honey-800">
                Students can&apos;t see this assignment until you upload its
                HTML file (in the settings panel on the right). Need a starting
                point?{" "}
                <a
                  href="/interactive-html-template.html"
                  download
                  className="underline font-medium hover:text-honey-900"
                >
                  Download the template
                </a>
                .
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isPeerReview && peerData && (
            <>
              {/* Pairing is per class (one copy per class). Switch between the
                  classes this peer review was given to. */}
              {publishStates.length > 1 && (
                <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
                  <p className="text-xs text-wood-500 mb-2">
                    Pairing is per class — you&apos;re pairing{" "}
                    <span className="font-medium text-wood-700">
                      {klass?.name ?? "this class"}
                      {klass?.period_number != null
                        ? ` · Period ${klass.period_number}`
                        : ""}
                    </span>
                    . Switch class to pair another period.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {publishStates.map((c) => {
                      const active = c.id === assignmentId;
                      return (
                        <Link
                          key={c.id}
                          href={`/teacher/assignments/${c.id}`}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            active
                              ? "bg-terracotta-500 text-white border-terracotta-500"
                              : "bg-cream-50 text-wood-700 border-wood-200 hover:bg-cream-100 hover:border-wood-300",
                          ].join(" ")}
                        >
                          {c.className}
                          {c.periodNumber != null ? ` · P${c.periodNumber}` : ""}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              <PeerReviewManager
                assignmentId={assignmentId}
                sourceTitle={peerData.sourceTitle}
                students={peerData.students}
                matchups={peerData.matchups}
                sourceSubmitters={peerData.sourceSubmitters}
              />
            </>
          )}
          {!isPeerReview && (
          <>
          <div className="grid grid-cols-3 gap-3">
            <Card padded={false} className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-wood-500" strokeWidth={1.75} />
                <p className="label-eyebrow">Started</p>
              </div>
              <p className="font-display text-2xl text-wood-900 mt-1">
                {submissions.length}
              </p>
            </Card>
            <Card padded={false} className="p-4">
              <p className="label-eyebrow">Submitted</p>
              <p className="font-display text-2xl text-wood-900 mt-1">
                {submittedCount}
              </p>
            </Card>
            <Card padded={false} className="p-4 bg-sage-50 border-sage-200">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-sage-700" strokeWidth={1.75} />
                <p className="label-eyebrow text-sage-700">Graded</p>
              </div>
              <p className="font-display text-2xl text-sage-900 mt-1">
                {gradedCount}
              </p>
            </Card>
          </div>

          {collabConfig.collaborative && collabConfig.groupMode && (
            <>
              {/* Switch between the classes this assignment was given to, to
                  set up each class's groups without going back to the board. */}
              {publishStates.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-wood-500 mr-1">
                    Groups for class:
                  </span>
                  {publishStates.map((c) => {
                    const active = c.id === assignmentId;
                    return (
                      <Link
                        key={c.id}
                        href={`/teacher/assignments/${c.id}`}
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "bg-terracotta-500 text-white border-terracotta-500"
                            : "bg-cream-50 text-wood-700 border-wood-200 hover:bg-cream-100 hover:border-wood-300",
                        ].join(" ")}
                      >
                        {c.className}
                        {c.periodNumber != null ? ` · P${c.periodNumber}` : ""}
                      </Link>
                    );
                  })}
                </div>
              )}

              <GroupManager
                assignmentId={assignmentId}
                mode={collabConfig.groupMode}
                maxGroupSize={collabConfig.maxGroupSize}
                groups={groups}
                roster={roster}
                maxPoints={assignment.points}
              />
            </>
          )}

          <h2 className="font-display text-xl text-wood-800 pt-2">
            Submissions
          </h2>

          {/* Assignments are stored one copy per class, so this page shows just
              THIS class's submissions (and its bulk actions apply only here).
              Surface the other classes with their counts so a teacher who
              landed on an empty period can jump to the one with work. */}
          {publishStates.length > 1 && (
            <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
              <p className="text-xs text-wood-500 mb-2">
                Given to {publishStates.length} classes — submissions are per
                class. Viewing{" "}
                <span className="font-medium text-wood-700">
                  {klass?.name ?? "this class"}
                  {klass?.period_number != null
                    ? ` · Period ${klass.period_number}`
                    : ""}
                </span>
                .
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {publishStates.map((c) => {
                  const active = c.id === assignmentId;
                  return (
                    <Link
                      key={c.id}
                      href={`/teacher/assignments/${c.id}`}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-terracotta-500 text-white border-terracotta-500"
                          : "bg-cream-50 text-wood-700 border-wood-200 hover:bg-cream-100 hover:border-wood-300",
                      ].join(" ")}
                    >
                      {c.className}
                      {c.periodNumber != null ? ` · P${c.periodNumber}` : ""}
                      <span
                        className={[
                          "tabular-nums rounded-full px-1.5 min-w-[1.25rem] text-center",
                          active
                            ? "bg-white/20 text-white"
                            : c.submissionCount > 0
                              ? "bg-terracotta-100 text-terracotta-800"
                              : "bg-cream-200 text-wood-400",
                        ].join(" ")}
                      >
                        {c.submissionCount}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <BulkGradePanel
            assignmentId={assignmentId}
            assignmentType={assignment.type as AssignmentType}
            maxPoints={assignment.points}
            rows={submissionRows}
          />
          </>
          )}
        </div>

        <div className="space-y-4">
          <ShareLink
            path={`/assignments/${assignment.assignment_group_id ?? assignmentId}`}
            description="One link for Canvas — works for every class period. Each student opens it once signed in and is taken to their own period's copy."
            warning={
              assignment.published
                ? isInteractive && !hasInteractiveHtml
                  ? "Upload the HTML file above for the link to work."
                  : null
                : "Publish this assignment for the link to work."
            }
          />

          <PublishToClassesPanel states={publishStates} />

          {acceptsHtml && (
            <Card>
              <h3 className="font-display text-lg text-wood-900 mb-1">
                {isInteractive ? "Interactive HTML" : "HTML prompt"}
              </h3>
              <p className="text-xs text-wood-500 mb-3">
                {hasInteractiveHtml
                  ? "File uploaded. Re-uploading replaces it."
                  : isInteractive
                    ? "Upload the activity file to make this assignment visible to students."
                    : "Optional — upload an HTML file to render a rich prompt above the assignment."}
              </p>
              <form action={uploadHtmlAction} className="space-y-3">
                <div className="flex items-start gap-2 p-2 rounded-cozy border border-dashed border-wood-300 bg-cream-50">
                  <FileCode2
                    className="w-5 h-5 text-wood-400 flex-shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="html_file"
                    name="html_file"
                    type="file"
                    accept=".html,text/html"
                    required
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-xs file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer"
                  />
                </div>
                <Button type="submit" size="sm" className="w-full">
                  Upload HTML
                </Button>
              </form>

              {hasInteractiveHtml && assignment.interactive_html_url && (
                <a
                  href={assignment.interactive_html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-terracotta-700 hover:text-terracotta-800 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview in new tab
                </a>
              )}

              <a
                href="/interactive-html-template.html"
                download
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-wood-600 hover:text-terracotta-700 transition-colors ml-4"
              >
                <Download className="w-3 h-3" />
                Template
              </a>
            </Card>
          )}

          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Settings
            </h3>
            <AssignmentSettingsForm
              assignmentId={assignmentId}
              type={assignment.type}
              initialTitle={assignment.title}
              initialInstructions={assignment.instructions ?? ""}
              units={units}
              initialLessonId={assignment.lesson_id}
              initialIsUnitQuiz={assignment.is_unit_quiz}
              dueLocal={dueLocal}
              due1_5xLocal={due1_5xLocal}
              due2xLocal={due2xLocal}
              initialPoints={assignment.points}
              isTextual={isTextual}
              initialMinimumWordCount={assignment.minimum_word_count}
              initialRubricId={assignment.rubric_id}
              rubrics={rubrics}
              initialCodeRunMode={resolvedCodeRunMode}
              initialIsPractice={assignment.is_practice}
              initialAutoPublishToStarhub={autoPublishToStarhub}
              isInteractive={isInteractive}
              hasInteractiveHtml={hasInteractiveHtml}
              isCode={isCode}
              collabConfig={collabConfig}
            />
          </Card>

          <CopyToClassPanel
            assignmentId={assignmentId}
            classes={otherClasses}
          />

          <Card className="border-terracotta-200 bg-terracotta-50/50">
            <h3 className="font-display text-base text-terracotta-900 mb-1">
              Danger zone
            </h3>
            <p className="text-xs text-terracotta-800 mb-3">
              Deletes this assignment from{" "}
              {publishStates.length > 1
                ? `all ${publishStates.length} of its classes`
                : "its class"}{" "}
              — along with every submission. This can&apos;t be undone.
            </p>
            <form action={deleteAction}>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                className="w-full"
              >
                Delete assignment
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}