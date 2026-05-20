import Link from "next/link";
import { ArrowRight, Users, BookOpen, ClipboardList, Code2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { TodaySlideshow } from "@/components/dashboard/TodaySlideshow";

export default async function TeacherDashboard() {
  const user = await requireTeacher();
  const supabase = await createClient();

  const [
    { data: classes },
    { data: units },
    { data: assignments },
    { data: ungraded },
  ] = await Promise.all([
    supabase.from("classes").select("id, enrollments(count)"),
    supabase.from("units").select("id, published"),
    supabase.from("assignments").select("id, published"),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);

  const classCount = classes?.length ?? 0;
  const studentCount =
    classes?.reduce(
      (sum, c) =>
        sum +
        (Array.isArray(c.enrollments) && c.enrollments[0]
          ? c.enrollments[0].count
          : 0),
      0
    ) ?? 0;
  const unitCount = units?.length ?? 0;
  const publishedUnits = units?.filter((u) => u.published).length ?? 0;
  const assignmentCount = assignments?.length ?? 0;
  const publishedAssignments =
    assignments?.filter((a) => a.published).length ?? 0;
  const ungradedCount = (ungraded as unknown as { count?: number })?.count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.first_name}`}
        description="Your hub for Game Design — three sections, one cozy spot."
      />

      <div className="mb-6">
        <TodaySlideshow role="teacher" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Card>
          <p className="label-eyebrow">Classes</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {classCount}
          </p>
          <p className="text-xs text-wood-500 mt-0.5">
            {studentCount} {studentCount === 1 ? "student" : "students"}
          </p>
        </Card>
        <Card>
          <p className="label-eyebrow">Units</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {unitCount}
          </p>
          {unitCount > 0 && (
            <p className="text-xs text-wood-500 mt-0.5">
              {publishedUnits} published
            </p>
          )}
        </Card>
        <Card>
          <p className="label-eyebrow">Assignments</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {assignmentCount}
          </p>
          {assignmentCount > 0 && (
            <p className="text-xs text-wood-500 mt-0.5">
              {publishedAssignments} published
            </p>
          )}
        </Card>
        <Card
          className={
            ungradedCount > 0
              ? "bg-honey-50 border-honey-200"
              : "bg-sage-50 border-sage-200"
          }
        >
          <p
            className={[
              "label-eyebrow",
              ungradedCount > 0 ? "text-honey-700" : "text-sage-700",
            ].join(" ")}
          >
            To grade
          </p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {ungradedCount}
          </p>
          <p className="text-xs text-wood-500 mt-0.5">
            {ungradedCount > 0 ? "Submissions waiting" : "All caught up"}
          </p>
        </Card>
      </div>

      <h2 className="font-display text-xl text-wood-800 mb-4">Get to work</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/teacher/classes" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-terracotta-100 text-terracotta-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Classes</CardTitle>
                <CardDescription>
                  Rosters, CSV import, move students between sections.
                </CardDescription>
                <p className="text-sm text-terracotta-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/teacher/lessons" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Lessons</CardTitle>
                <CardDescription>
                  Units, lesson HTML, completion tracking.
                </CardDescription>
                <p className="text-sm text-sage-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/teacher/assignments" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Assignments</CardTitle>
                <CardDescription>
                  Create, edit, grade. Code + interactive HTML so far.
                </CardDescription>
                <p className="text-sm text-honey-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Sandbox callout — for demo / showing off the editor */}
      <Card className="bg-cream-50 border-honey-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Code editor sandbox</CardTitle>
              <span className="label-eyebrow text-honey-700">Demo</span>
            </div>
            <CardDescription>
              The Monaco editor with Unity autocomplete, in a standalone
              playground. Type <code className="text-terracotta-700">transform.</code>{" "}
              or <code className="text-terracotta-700">Debug.</code> to see
              completions. Great for walkthroughs.
            </CardDescription>
            <Link
              href="/teacher/sandbox"
              className="text-sm text-honey-700 mt-3 inline-flex items-center gap-1 font-medium hover:text-honey-800 transition-colors"
            >
              Open sandbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Card>
    </>
  );
}