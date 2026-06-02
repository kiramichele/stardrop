import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Award } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  DEMO_VIEWER_STUDENT,
  DEMO_ASSIGNMENTS,
  DEMO_LESSON_TOTAL,
} from "@/lib/demo/fixtures";

export default function DemoStudentDashboard() {
  const me = DEMO_VIEWER_STUDENT;
  const pending = DEMO_ASSIGNMENTS.filter(
    (a) => a.published && (a.viewer.status === null || a.viewer.status === "draft")
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${me.firstName}!`}
        description="Welcome to Game Design. Your lessons, assignments, and progress live here."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Card className="bg-honey-50 border-honey-200">
          <p className="label-eyebrow text-honey-700">Lessons done</p>
          <p className="font-display text-3xl text-wood-900 mt-1">
            {me.lessonsCompleted}
            <span className="text-base text-wood-400">/{DEMO_LESSON_TOTAL}</span>
          </p>
        </Card>
        <Card>
          <p className="label-eyebrow">To do</p>
          <p className="font-display text-3xl text-wood-900 mt-1">{pending}</p>
          <p className="text-xs text-wood-500 mt-0.5">
            {pending === 1 ? "assignment" : "assignments"} not turned in
          </p>
        </Card>
        <Card className="bg-sage-50 border-sage-200">
          <p className="label-eyebrow text-sage-700">Average</p>
          <p className="font-display text-3xl text-sage-800 mt-1">
            {me.averagePct === null ? "—" : `${me.averagePct}%`}
          </p>
        </Card>
      </div>

      <h2 className="font-display text-xl text-wood-800 mb-4">Jump in</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/demo/student/lessons" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Lessons</CardTitle>
                <CardDescription>
                  Work through units in order, at your own pace.
                </CardDescription>
                <p className="text-sm text-sage-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/demo/student/assignments" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-terracotta-100 text-terracotta-700 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Assignments</CardTitle>
                <CardDescription>
                  Code, write, and upload — right in the browser.
                </CardDescription>
                <p className="text-sm text-terracotta-700 mt-3 inline-flex items-center gap-1 font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/demo/student/grades" className="block">
          <Card hoverable className="h-full">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-cozy bg-honey-100 text-honey-700 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Grades</CardTitle>
                <CardDescription>
                  See your scores and your running average.
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
