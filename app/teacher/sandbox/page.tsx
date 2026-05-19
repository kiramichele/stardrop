import Link from "next/link";
import { ArrowRight, Users, Sparkles, Code2, BookOpen } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";

export default async function TeacherDashboard() {
  const user = await requireTeacher();
  const supabase = await createClient();

  const [{ data: classes }, { data: units }] = await Promise.all([
    supabase.from("classes").select("id, name, enrollments(count)"),
    supabase.from("units").select("id, published"),
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

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.first_name}`}
        description="Your hub for Game Design — three sections, one cozy spot."
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
        <Card>
          <p className="label-eyebrow">Classes</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {classCount}
          </p>
        </Card>
        <Card>
          <p className="label-eyebrow">Students</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {studentCount}
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
        <Card className="bg-honey-50 border-honey-200">
          <p className="label-eyebrow text-honey-700">Phase 2</p>
          <p className="font-display text-lg text-wood-900 mt-1 leading-tight">
            Assignments next
          </p>
        </Card>
      </div>

      <h2 className="font-display text-xl text-wood-800 mb-4">Get started</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link href="/teacher/classes" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-terracotta-100 text-terracotta-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Manage classes</CardTitle>
                <CardDescription>
                  View rosters, import students from a CSV, generate login
                  credentials.
                </CardDescription>
                <p className="text-sm text-terracotta-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open classes <ArrowRight className="w-3.5 h-3.5" />
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
                <CardTitle className="text-lg">Build curriculum</CardTitle>
                <CardDescription>
                  Add units and lessons. Upload HTML files for students to
                  work through.
                </CardDescription>
                <p className="text-sm text-sage-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open lessons <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Sandbox callout — temporary, remove when assignments ship */}
      <Card className="bg-cream-50 border-honey-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Code editor sandbox</CardTitle>
              <span className="label-eyebrow text-honey-700">In progress</span>
            </div>
            <CardDescription>
              Test the Monaco editor with Unity autocomplete. Try typing{" "}
              <code className="text-terracotta-700">transform.</code> or{" "}
              <code className="text-terracotta-700">Debug.</code> to see
              suggestions.
            </CardDescription>
            <Link
              href="/teacher/sandbox"
              className="text-sm text-honey-700 mt-3 inline-flex items-center gap-1 font-medium hover:text-honey-800 transition-colors"
            >
              Try the editor <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-cozy bg-cream-200 text-wood-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg text-wood-700">
                Assignments
              </CardTitle>
              <CardDescription>
                Code, written, discussion, Unity uploads, and check-ins.
                Coming next session.
              </CardDescription>
              <p className="label-eyebrow mt-3">Coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}