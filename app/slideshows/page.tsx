import Link from "next/link";
import { ArrowRight, Presentation, FileCode2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUnitsForTeacher } from "@/lib/lessons";
import { getAssignmentsForTeacher } from "@/lib/assignments-server";
import { getSlideshows } from "@/lib/slideshows-server";
import {
  formatClassDate,
  weekStartString,
  formatWeekRange,
} from "@/lib/slideshows";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlideshowForm } from "@/components/slideshows/SlideshowForm";
import { createSlideshow } from "./actions";

export default async function SlideshowsPage() {
  const user = await requireUser();
  const isTeacher = user.role === "teacher";

  const slideshows = await getSlideshows();

  let lessonOptions: { id: string; title: string }[] = [];
  let assignmentOptions: { id: string; title: string }[] = [];
  if (isTeacher) {
    const [units, assignments] = await Promise.all([
      getUnitsForTeacher(),
      getAssignmentsForTeacher(),
    ]);
    lessonOptions = units.flatMap((u) =>
      u.lessons.map((l) => ({ id: l.id, title: l.title }))
    );
    assignmentOptions = assignments.map((a) => ({ id: a.id, title: a.title }));
  }

  // Students follow the semester in order (oldest week at the top, newest
  // at the bottom); the teacher sees newest first. Sorting here keeps
  // same-week slideshows contiguous either way, so the grouping loop works.
  const ordered = [...slideshows].sort((a, b) =>
    isTeacher
      ? b.classDate.localeCompare(a.classDate)
      : a.classDate.localeCompare(b.classDate)
  );

  const weekGroups: {
    weekStart: string;
    label: string;
    items: typeof slideshows;
  }[] = [];
  for (const s of ordered) {
    const ws = weekStartString(s.classDate);
    const last = weekGroups[weekGroups.length - 1];
    if (last && last.weekStart === ws) {
      last.items.push(s);
    } else {
      weekGroups.push({ weekStart: ws, label: formatWeekRange(ws), items: [s] });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Slideshows"
        title="Class slideshows"
        description="Every day's slideshow, organized by date. Open one to see what the class did and which lessons or assignments went with it."
      />

      {isTeacher && (
        <Card className="mb-8">
          <h2 className="font-display text-lg text-wood-900 mb-1">
            Post a slideshow
          </h2>
          <p className="text-sm text-wood-600 mb-4">
            Upload the HTML file, pick the class date, and link any lessons or
            assignments you covered.
          </p>
          <SlideshowForm
            mode="create"
            lessons={lessonOptions}
            assignments={assignmentOptions}
            action={createSlideshow}
            submitLabel="Post slideshow"
          />
        </Card>
      )}

      {slideshows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Presentation}
            title="No slideshows yet"
            description={
              isTeacher
                ? "Post your first slideshow above and it will show up here and on the dashboard."
                : "Ms. Shinn hasn't posted any slideshows yet. Check back after class."
            }
          />
        </Card>
      ) : (
        <div className="space-y-7">
          {weekGroups.map((g) => (
            <section key={g.weekStart}>
              <h2 className="font-display text-xl text-wood-800 mb-3">
                Week of {g.label}
              </h2>
              <div className="space-y-2.5">
                {g.items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/slideshows/${s.id}`}
                    className="block"
                  >
                    <Card hoverable padded={false} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
                          <Presentation
                            className="w-5 h-5"
                            strokeWidth={1.75}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="label-eyebrow text-wood-500">
                            {formatClassDate(s.classDate)}
                          </p>
                          <h3 className="font-display text-lg text-wood-900 truncate">
                            {s.title}
                          </h3>
                          {s.description && (
                            <p className="text-sm text-wood-600 truncate">
                              {s.description}
                            </p>
                          )}
                        </div>
                        {!s.htmlUrl && (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-wood-400 flex-shrink-0"
                            title="No HTML file uploaded"
                          >
                            <FileCode2 className="w-3.5 h-3.5" />
                            No file
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-wood-400 flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
