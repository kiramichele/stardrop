import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TodaySlideshow } from "@/components/dashboard/TodaySlideshow";
import { AchievementsSummary } from "@/components/dashboard/AchievementsSummary";
import { StudentOrientation } from "@/components/onboarding/StudentOrientation";

export default async function StudentDashboard() {
  const user = await requireStudent();
  const firstTime = !user.onboarded_at;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${user.first_name}!`}
        description="Welcome to Game Design. Your daily plan, lessons, and assignments will live here."
        action={<StudentOrientation autoOpen={firstTime} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <TodaySlideshow role="student" />
        <Card>
          <p className="label-eyebrow">Pending</p>
          <p className="font-display text-3xl text-wood-900 mt-1">0</p>
          <p className="text-xs text-wood-500 mt-0.5">No assignments yet</p>
        </Card>
      </div>

      <AchievementsSummary userId={user.id} />
    </>
  );
}
