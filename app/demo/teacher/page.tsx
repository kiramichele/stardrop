import Link from "next/link";
import { ArrowRight, Users, BarChart3, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  DEMO_TEACHER,
  DEMO_STUDENTS,
  DEMO_UNITS,
  DEMO_ASSIGNMENTS,
  DEMO_GRADING_QUEUE,
} from "@/lib/demo/fixtures";

export default function DemoTeacherDashboard() {
  const studentCount = DEMO_STUDENTS.length;
  const unitCount = DEMO_UNITS.length;
  const publishedUnits = DEMO_UNITS.filter((u) => u.published).length;
  const assignmentCount = DEMO_ASSIGNMENTS.length;
  const publishedAssignments = DEMO_ASSIGNMENTS.filter((a) => a.published).length;
  const ungradedCount = DEMO_GRADING_QUEUE.length;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${DEMO_TEACHER.first_name}`}
        description="Your hub for Game Design — one cozy spot for the whole class."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Card>
          <p className="label-eyebrow">Class</p>
          <p className="font-display text-3xl text-wood-900 mt-1">1</p>
          <p className="text-xs text-wood-500 mt-0.5">
            {studentCount} students
          </p>
        </Card>
        <Card>
          <p className="label-eyebrow">Units</p>
          <p className="font-display text-3xl text-wood-900 mt-1">{unitCount}</p>
          <p className="text-xs text-wood-500 mt-0.5">{publishedUnits} published</p>
        </Card>
        <Card>
          <p className="label-eyebrow">Assignments</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {assignmentCount}
          </p>
          <p className="text-xs text-wood-500 mt-0.5">
            {publishedAssignments} published
          </p>
        </Card>
        <Card className="bg-honey-50 border-honey-200">
          <p className="label-eyebrow text-honey-700">To grade</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {ungradedCount}
          </p>
          <p className="text-xs text-wood-500 mt-0.5">Submissions waiting</p>
        </Card>
      </div>

      <h2 className="font-display text-xl text-wood-800 mb-4">Get to work</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/demo/teacher/students" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-terracotta-100 text-terracotta-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Roster</CardTitle>
                <CardDescription>
                  See every student and open their full record.
                </CardDescription>
                <p className="text-sm text-terracotta-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/demo/teacher/analytics" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Analytics</CardTitle>
                <CardDescription>
                  Completions, scores by unit, and who needs a hand.
                </CardDescription>
                <p className="text-sm text-sage-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/demo/teacher/grading" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Grading</CardTitle>
                <CardDescription>
                  Work through the queue of submitted assignments.
                </CardDescription>
                <p className="text-sm text-honey-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </>
  );
}
