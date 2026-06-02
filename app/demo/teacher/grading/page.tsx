import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import {
  AssignmentTypeBadge,
  SubmissionStatusBadge,
} from "@/components/assignments/Badges";
import { DEMO_GRADING_QUEUE, findDemoStudent } from "@/lib/demo/fixtures";

export default function DemoGradingPage() {
  const queue = DEMO_GRADING_QUEUE;

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Grading"
        description="Submitted work waiting on you, newest first. Open one to leave a score and feedback."
      />

      {queue.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-sage-600 mb-3" strokeWidth={1.5} />
            <p className="font-display text-lg text-wood-800">All caught up</p>
            <p className="text-sm text-wood-600 mt-1">
              Nothing in the grading queue right now.
            </p>
          </div>
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {queue.map((s) => {
              const student = findDemoStudent(s.studentId);
              return (
                <li key={s.id} className="p-1.5">
                  <Link
                    href={`/demo/teacher/students/${s.studentId}`}
                    className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                  >
                    <Avatar
                      firstName={student?.firstName ?? s.studentName}
                      lastName={student?.lastName ?? ""}
                      avatarUrl={null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-wood-900 truncate">
                          {s.studentName}
                        </p>
                        <AssignmentTypeBadge type={s.assignmentType} />
                      </div>
                      <p className="text-xs text-wood-500 truncate">
                        {s.assignmentTitle} · submitted {s.submittedAt}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <SubmissionStatusBadge status="submitted" isLate={s.isLate} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
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
