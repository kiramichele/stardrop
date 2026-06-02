import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  AssignmentTypeBadge,
  SubmissionStatusBadge,
} from "@/components/assignments/Badges";
import { DEMO_ASSIGNMENTS } from "@/lib/demo/fixtures";

export default function DemoStudentAssignments() {
  const assignments = DEMO_ASSIGNMENTS.filter((a) => a.published);

  return (
    <>
      <PageHeader
        eyebrow="Game Design"
        title="Assignments"
        description="Everything assigned so far. Open one to work on it and turn it in."
      />

      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-wood-100">
          {assignments.map((a) => (
            <li key={a.id} className="p-1.5">
              <Link
                href={`/demo/student/assignments/${a.id}`}
                className="group flex items-center gap-3 px-3 py-3.5 rounded-cozy hover:bg-cream-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-wood-900 truncate">
                      {a.title}
                    </p>
                    <AssignmentTypeBadge type={a.type} />
                  </div>
                  <p className="text-xs text-wood-500">
                    {a.unitTitle} · {a.points} pts · Due {a.dueDate}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <SubmissionStatusBadge
                    status={a.viewer.status}
                    hasGrade={a.viewer.status === "graded"}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
