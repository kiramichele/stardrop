import Link from "next/link";
import { ArrowRight, Users, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";

export default async function TeacherDashboard() {
  const user = await requireTeacher();
  const supabase = await createClient();

  // Pull a quick at-a-glance count
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, enrollments(count)");

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

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${user.first_name}`}
        description="Your hub for Game Design — three sections, one cozy spot."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
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
        <Card className="bg-honey-50 border-honey-200">
          <p className="label-eyebrow text-honey-700">Phase 2</p>
          <p className="font-display text-lg text-wood-900 mt-1 leading-tight">
            Curriculum coming next
          </p>
        </Card>
      </div>

      <h2 className="font-display text-xl text-wood-800 mb-4">Get started</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card className="h-full opacity-75">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-cozy bg-cream-200 text-wood-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg text-wood-700">
                Build curriculum
              </CardTitle>
              <CardDescription>
                Units, lessons, and the Unity-aware code editor land in the next
                build session.
              </CardDescription>
              <p className="label-eyebrow mt-3">Coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}