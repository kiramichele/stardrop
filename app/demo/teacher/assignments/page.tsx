import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  AssignmentTypeBadge,
  PublishBadge,
} from "@/components/assignments/Badges";
import { DEMO_ASSIGNMENTS } from "@/lib/demo/fixtures";

export default function DemoAssignmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Assignments"
        description="Everything assigned this term — code, short answer, uploads, and discussions."
      />

      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-wood-100">
          {DEMO_ASSIGNMENTS.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-wood-900 truncate">
                    {a.title}
                  </p>
                  <AssignmentTypeBadge type={a.type} />
                  {a.isUnitQuiz && (
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide-label text-terracotta-700 bg-terracotta-100 rounded px-1.5 py-0.5">
                      Quiz
                    </span>
                  )}
                </div>
                <p className="text-xs text-wood-500">
                  {a.unitTitle} · {a.points} pts · Due {a.dueDate}
                </p>
              </div>
              <div className="flex-shrink-0">
                <PublishBadge published={a.published} />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
