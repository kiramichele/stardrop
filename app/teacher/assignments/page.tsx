import Link from "next/link";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { getAssignmentsForTeacher, type AssignmentType } from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AssignmentTypeBadge,
  PublishBadge,
} from "@/components/assignments/Badges";

export default async function TeacherAssignmentsPage() {
  const assignments = await getAssignmentsForTeacher();

  return (
    <>
      <PageHeader
        eyebrow="Curriculum"
        title="Assignments"
        description="Create, edit, and grade work across all sections."
        action={
          <Link href="/teacher/assignments/new">
            <Button>
              <Plus className="w-4 h-4" strokeWidth={2} />
              New assignment
            </Button>
          </Link>
        }
      />

      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="Create your first assignment. Code assignments use the Monaco editor with Unity autocomplete."
            action={
              <Link href="/teacher/assignments/new">
                <Button>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create your first assignment
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {assignments.map((a) => {
              const klass = Array.isArray(a.classes) ? a.classes[0] : a.classes;
              const subCount =
                Array.isArray(a.submissions) && a.submissions[0]
                  ? a.submissions[0].count
                  : 0;
              return (
                <li key={a.id} className="p-1.5">
                  <Link
                    href={`/teacher/assignments/${a.id}`}
                    className="group flex items-center gap-4 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium text-wood-900 truncate">
                          {a.title}
                        </p>
                        <AssignmentTypeBadge type={a.type as AssignmentType} />
                        <PublishBadge published={a.published} />
                      </div>
                      <p className="text-xs text-wood-500">
                        {klass?.name ?? "Unknown class"}
                        {a.due_date &&
                          ` · due ${new Date(a.due_date).toLocaleDateString()}`}
                        {a.points && ` · ${a.points} pts`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-xl text-terracotta-700">
                        {subCount}
                      </p>
                      <p className="text-[0.65rem] uppercase tracking-wide-label text-wood-500 font-semibold">
                        {subCount === 1 ? "submission" : "submissions"}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}