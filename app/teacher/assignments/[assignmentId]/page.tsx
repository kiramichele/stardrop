import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Users } from "lucide-react";
import {
  getAssignment,
  getSubmissionsForAssignment,
  computeLateness,
  type AssignmentType,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  AssignmentTypeBadge,
  SubmissionStatusBadge,
} from "@/components/assignments/Badges";
import { updateAssignment, deleteAssignment } from "../actions";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = await getAssignment(assignmentId);
  if (!assignment) notFound();

  const submissions = await getSubmissionsForAssignment(assignmentId);
  const klass = Array.isArray(assignment.classes)
    ? assignment.classes[0]
    : assignment.classes;

  const updateAction = updateAssignment.bind(null, assignmentId);
  const deleteAction = deleteAssignment.bind(null, assignmentId);

  // Pre-format due_date for datetime-local input
  const dueLocal = assignment.due_date
    ? new Date(assignment.due_date).toISOString().slice(0, 16)
    : "";

  const submittedCount = submissions.filter(
    (s) => s.status === "submitted" || s.status === "graded"
  ).length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

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
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions column */}
        <div className="lg:col-span-2 space-y-4">
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

          <h2 className="font-display text-xl text-wood-800 pt-2">
            Submissions
          </h2>

          {submissions.length === 0 ? (
            <Card>
              <p className="text-sm text-wood-500 text-center py-4">
                No submissions yet.
              </p>
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {submissions.map((s) => {
                  const student = Array.isArray(s.users)
                    ? s.users[0]
                    : s.users;
                  const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
                  const { isLate, daysLate } = computeLateness(
                    s.submitted_at,
                    assignment.due_date
                  );
                  return (
                    <li key={s.id} className="p-1.5">
                      <Link
                        href={`/teacher/assignments/${assignmentId}/grade/${s.id}`}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-cozy hover:bg-cream-200 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-wood-900">
                            {student?.first_name} {student?.last_name}
                          </p>
                          <p className="text-xs text-wood-500">
                            {s.submitted_at
                              ? `Submitted ${new Date(s.submitted_at).toLocaleString()}`
                              : s.updated_at
                                ? `Last edited ${new Date(s.updated_at).toLocaleString()}`
                                : "Not started"}
                            {isLate && ` · ${daysLate}d late`}
                          </p>
                        </div>
                        {grade && (
                          <div className="text-right">
                            <p className="font-display text-lg text-sage-700">
                              {grade.score}
                              <span className="text-wood-400 text-sm font-normal">
                                /{assignment.points}
                              </span>
                            </p>
                          </div>
                        )}
                        <SubmissionStatusBadge
                          status={s.status}
                          hasGrade={!!grade}
                          isLate={isLate}
                        />
                        <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        {/* Settings column */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Settings
            </h3>
            <form action={updateAction} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={assignment.title}
                  required
                />
              </div>
              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  name="instructions"
                  rows={5}
                  defaultValue={assignment.instructions ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="due_date">Due date</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="datetime-local"
                  defaultValue={dueLocal}
                />
              </div>
              <div>
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  name="points"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue={assignment.points}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  defaultChecked={assignment.published}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                />
                <Label htmlFor="published" className="mb-0">
                  Published (visible to students)
                </Label>
              </div>
              <Button type="submit" size="sm" className="w-full">
                Save changes
              </Button>
            </form>
          </Card>

          <Card className="border-terracotta-200 bg-terracotta-50/50">
            <h3 className="font-display text-base text-terracotta-900 mb-1">
              Danger zone
            </h3>
            <p className="text-xs text-terracotta-800 mb-3">
              Deleting an assignment also deletes its submissions.
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