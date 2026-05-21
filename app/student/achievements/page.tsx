import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudentAchievementStats } from "@/lib/achievements-server";
import { evaluateAchievements } from "@/lib/achievements";
import { AchievementGrid } from "@/components/achievements/AchievementGrid";

export default async function AchievementsPage() {
  const user = await requireStudent();
  const stats = await getStudentAchievementStats(user.id);
  const achievements = evaluateAchievements(stats);

  return (
    <>
      <PageHeader
        eyebrow="Achievements"
        title="Your badges"
        description="Little milestones you collect as you learn. Keep showing up — there's always one more to earn."
      />
      <AchievementGrid achievements={achievements} />
    </>
  );
}
