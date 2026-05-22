import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getGradingQueue } from "@/lib/assignments-server";
import {
  computeLateness,
  effectiveDueDate,
  type AssignmentType,
} from "@/lib/assignments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";

// How long a submission has been waiting, as a compact label.
function formatAge(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function ageInDays(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

type QueueRow = {
  id: string;
  assignmentId: string;
  studentName: string;
  assignmentTitle: string;
  type: AssignmentType;
  classId: string;
  classLabel: string;
  submittedAt: string | null;
  isLate: boolean;
  daysLate: number;
};

export default async function GradingQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  await requireTeacher();
  const { class: classFilter } = await searchParams;
  const queue = await getGradingQueue();

  const rows: QueueRow[] = queue.map((s) => {
    const student = Array.isArray(s.users) ? s.users[0] : s.users;
    const assignment = Array.isArray(s.assignments)
      ? s.assignments[0]
      : s.assignments;
    const klass = assignment
      ? Array.isArray(assignment.classes)
        ? assignment.classes[0]
        : assignment.classes
      : null;
    const { isLate, daysLate } = computeLateness(
      s.submitted_at,
      assignment ? effectiveDueDate(assignment, student?.extended_time) : null
    );
    return {
      id: s.id,
      assignmentId: assignment?.id ?? "",
      studentName:
        `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() ||
        "Unknown student",
      assignmentTitle: assignment?.title ?? "Assignment",
      type: (assignment?.type ?? "code") as AssignmentType,
      classId: klass?.id ?? "",
      classLabel: klass
        ? klass.period_number != null
          ? `${klass.name} · Period ${klass.period_number}`
          : klass.name
        : "Unknown class",
      submittedAt: s.submitted_at,
      isLate,
      daysLate,
    };
  });

  // Distinct classes with ungraded work — drives the filter chips.
  const classMap = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    if (!r.classId) continue;
    const entry = classMap.get(r.classId) ?? { label: r.classLabel, count: 0 };
    entry.count += 1;
    classMap.set(r.classId, entry);
  }
  const classes = [...classMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const activeClass =
    classFilter && classMap.has(classFilter) ? classFilter : null;
  const visible = activeClass
    ? rows.filter((r) => r.classId === activeClass)
    : rows;

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Grading queue"
        description="Every submission waiting on a grade, across all assignments, oldest first. Click a row to grade it."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="All caught up"
            description="Nothing is waiting to be graded right now. New submissions land here the moment students turn them in."
          />
        </Card>
      ) : (
        <>
          {classes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <FilterChip
                href="/teacher/grading"
                label="All"
                count={rows.length}
                active={!activeClass}
              />
              {classes.map((c) => (
                <FilterChip
                  key={c.id}
                  href={`/teacher/grading?class=${c.id}`}
                  label={c.label}
                  count={c.count}
                  active={activeClass === c.id}
                />
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <Card>
              <p className="text-sm text-wood-500 text-center py-4">
                Nothing waiting to grade in this class.
              </p>
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {visible.map((r) => {
                  const stale = ageInDays(r.submittedAt) >= 7;
                  return (
                    <li key={r.id} className="p-1.5">
                      <Link
                        href={`/teacher/assignments/${r.assignmentId}/grade/${r.id}`}
                        className="group flex items-center gap-3 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-wood-900 truncate">
                              {r.studentName}
                            </p>
                            {r.isLate && (
                              <span className="flex-shrink-0 text-[0.65rem] font-semibold text-terracotta-800 bg-terracotta-100 border border-terracotta-200 rounded px-1.5 py-0.5">
                                {r.daysLate} day{r.daysLate === 1 ? "" : "s"} late
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-wood-500 truncate mt-0.5">
                            {r.assignmentTitle}
                            <span className="text-wood-400">
                              {" · "}
                              {r.classLabel}
                            </span>
                          </p>
                        </div>

                        <div className="flex-shrink-0 hidden sm:block">
                          <AssignmentTypeBadge type={r.type} />
                        </div>

                        <p
                          className={[
                            "flex-shrink-0 w-20 text-right text-xs tabular-nums",
                            stale
                              ? "text-terracotta-700 font-semibold"
                              : "text-wood-500",
                          ].join(" ")}
                        >
                          waiting {formatAge(r.submittedAt)}
                        </p>

                        <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors",
        active
          ? "bg-terracotta-500 text-white"
          : "bg-cream-200 text-wood-700 hover:bg-cream-300",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "text-xs tabular-nums",
          active ? "text-white/80" : "text-wood-500",
        ].join(" ")}
      >
        {count}
      </span>
    </Link>
  );
}
