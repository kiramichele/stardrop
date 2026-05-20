import { Sparkles } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TodaySlideshow } from "@/components/dashboard/TodaySlideshow";

export default async function StudentDashboard() {
  const user = await requireStudent();

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hi, ${user.first_name}!`}
        description="Welcome to Game Design. Your daily plan, lessons, and assignments will live here."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <TodaySlideshow role="student" />
        <Card>
          <p className="label-eyebrow">Pending</p>
          <p className="font-display text-3xl text-wood-900 mt-1">0</p>
          <p className="text-xs text-wood-500 mt-0.5">No assignments yet</p>
        </Card>
      </div>

      <Card>
        <EmptyState
          icon={Sparkles}
          title="More coming soon"
          description="Lessons, assignments, grades, discussions, and your daily plan are being built. The site will fill in as Ms. Shinn adds content."
        />
      </Card>
    </>
  );
}