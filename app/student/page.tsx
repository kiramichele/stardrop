import { Megaphone } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getActiveAnnouncementsForStudent } from "@/lib/announcements-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TodaySlideshow } from "@/components/dashboard/TodaySlideshow";
import { AchievementsSummary } from "@/components/dashboard/AchievementsSummary";
import { StudentOrientation } from "@/components/onboarding/StudentOrientation";

export default async function StudentDashboard() {
  const user = await requireStudent();
  const firstTime = !user.onboarded_at;
  const announcements = await getActiveAnnouncementsForStudent(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${user.first_name}!`}
        description="Welcome to Game Design. Your daily plan, lessons, and assignments will live here."
        action={<StudentOrientation autoOpen={firstTime} />}
      />

      {announcements.length > 0 && (
        <div className="space-y-3 mb-6">
          {announcements.map((a) => (
            <Card key={a.id} className="bg-honey-50 border-honey-200">
              <div className="flex items-start gap-3">
                <Megaphone
                  className="w-4 h-4 text-honey-700 flex-shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-honey-900 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="text-xs text-honey-700 mt-1">
                    {new Date(a.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {a.createdByName && ` · ${a.createdByName}`}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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
