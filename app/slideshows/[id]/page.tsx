import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ClipboardList, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUnitsForTeacher } from "@/lib/lessons";
import { getAssignmentsForTeacher } from "@/lib/assignments-server";
import {
  getSlideshow,
  resolveSlideshowLinks,
  getAssignmentsDueOn,
} from "@/lib/slideshows-server";
import { formatClassDate } from "@/lib/slideshows";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LessonViewer } from "@/components/lessons/LessonViewer";
import { SlideshowForm } from "@/components/slideshows/SlideshowForm";
import { updateSlideshow, deleteSlideshow } from "../actions";

export default async function SlideshowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const isTeacher = user.role === "teacher";
  const { id } = await params;

  const slideshow = await getSlideshow(id);
  if (!slideshow) notFound();

  const { lessons, assignments } = await resolveSlideshowLinks(slideshow);
  const dueAssignments = await getAssignmentsDueOn(slideshow.classDate);
  const lessonBase = isTeacher ? "/teacher/lessons" : "/student/lessons";
  const assignmentBase = isTeacher
    ? "/teacher/assignments"
    : "/student/assignments";

  let lessonOptions: { id: string; title: string }[] = [];
  let assignmentOptions: { id: string; title: string }[] = [];
  if (isTeacher) {
    const [units, allAssignments] = await Promise.all([
      getUnitsForTeacher(),
      getAssignmentsForTeacher(),
    ]);
    lessonOptions = units.flatMap((u) =>
      u.lessons.map((l) => ({ id: l.id, title: l.title }))
    );
    assignmentOptions = allAssignments.map((a) => ({
      id: a.id,
      title: a.title,
    }));
  }

  return (
    <>
      <Link
        href="/slideshows"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All slideshows
      </Link>

      <PageHeader
        eyebrow={formatClassDate(slideshow.classDate)}
        title={slideshow.title}
        description={slideshow.description ?? undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <LessonViewer htmlUrl={slideshow.htmlUrl} isCompleted={false} />
        </div>

        <div className="space-y-4">
          {dueAssignments.length > 0 && (
            <Card className="bg-honey-50 border-honey-200">
              <h3 className="font-display text-lg text-wood-900 mb-3">
                Due this day
              </h3>
              <div className="space-y-1.5">
                {dueAssignments.map((a) => (
                  <Link
                    key={a.id}
                    href={`${assignmentBase}/${a.id}`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-cozy text-sm text-wood-700 hover:bg-honey-100 hover:text-terracotta-700 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 flex-shrink-0 text-honey-700" />
                    <span className="truncate">{a.title}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {slideshow.asyncNote && (
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-wood-600" strokeWidth={2} />
                <h3 className="font-display text-lg text-wood-900">
                  Period 3 — async work
                </h3>
              </div>
              <p className="text-sm text-wood-700 whitespace-pre-wrap">
                {slideshow.asyncNote}
              </p>
            </Card>
          )}

          {(lessons.length > 0 || assignments.length > 0) && (
            <Card>
              <h3 className="font-display text-lg text-wood-900 mb-3">
                What we covered
              </h3>
              <div className="space-y-1.5">
                {lessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`${lessonBase}/${l.id}`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-cozy text-sm text-wood-700 hover:bg-cream-100 hover:text-terracotta-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 flex-shrink-0 text-sage-600" />
                    <span className="truncate">{l.title}</span>
                  </Link>
                ))}
                {assignments.map((a) => (
                  <Link
                    key={a.id}
                    href={`${assignmentBase}/${a.id}`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-cozy text-sm text-wood-700 hover:bg-cream-100 hover:text-terracotta-700 transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 flex-shrink-0 text-honey-600" />
                    <span className="truncate">{a.title}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {isTeacher && (
            <>
              <Card>
                <h3 className="font-display text-lg text-wood-900 mb-4">
                  Edit slideshow
                </h3>
                <SlideshowForm
                  mode="edit"
                  lessons={lessonOptions}
                  assignments={assignmentOptions}
                  initial={{
                    classDate: slideshow.classDate,
                    title: slideshow.title,
                    description: slideshow.description,
                    asyncNote: slideshow.asyncNote,
                    hasHtml: !!slideshow.htmlUrl,
                    lessonIds: slideshow.lessonIds,
                    assignmentIds: slideshow.assignmentIds,
                  }}
                  action={updateSlideshow.bind(null, slideshow.id)}
                  submitLabel="Save changes"
                />
              </Card>

              <Card className="border-terracotta-200 bg-terracotta-50/50">
                <h3 className="font-display text-base text-terracotta-900 mb-1">
                  Danger zone
                </h3>
                <p className="text-xs text-terracotta-800 mb-3">
                  Deleting removes the slideshow and its uploaded HTML.
                </p>
                <form action={deleteSlideshow.bind(null, slideshow.id)}>
                  <Button
                    type="submit"
                    variant="danger"
                    size="sm"
                    className="w-full"
                  >
                    Delete slideshow
                  </Button>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
