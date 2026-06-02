import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { DEMO_CLASS, DEMO_STUDENTS } from "@/lib/demo/fixtures";

// Demo roster. Same look as the real RosterView, but rows link into the
// /demo student record instead of the login-gated teacher route.
export default function DemoRosterPage() {
  const students = [...DEMO_STUDENTS].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName)
  );

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Students"
        description={`${students.length} students in ${DEMO_CLASS.name} · Period ${DEMO_CLASS.periodNumber}. Click anyone to open their full record.`}
      />

      <section>
        <h2 className="font-display text-xl text-wood-800 mb-3">
          {DEMO_CLASS.name} · Period {DEMO_CLASS.periodNumber}{" "}
          <span className="text-sm text-wood-400">({students.length})</span>
        </h2>
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {students.map((s) => (
              <li key={s.id} className="p-1.5">
                <Link
                  href={`/demo/teacher/students/${s.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-cozy hover:bg-cream-200 transition-colors"
                >
                  <Avatar
                    firstName={s.firstName}
                    lastName={s.lastName}
                    avatarUrl={s.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-wood-900 truncate">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-wood-500 font-mono truncate">
                      {s.username}
                    </p>
                  </div>
                  <p className="text-xs text-wood-500 flex-shrink-0">
                    {s.averagePct === null
                      ? "no grades yet"
                      : `${s.averagePct}% avg`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </>
  );
}
