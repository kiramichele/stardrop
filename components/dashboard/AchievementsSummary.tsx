import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getStudentAchievementStats } from "@/lib/achievements-server";
import {
  evaluateAchievements,
  countEarned,
  nextAchievement,
} from "@/lib/achievements";

/**
 * Compact badge-progress card for the student dashboard. Derives the same
 * achievement data as the full /student/achievements page.
 */
export async function AchievementsSummary({ userId }: { userId: string }) {
  const stats = await getStudentAchievementStats(userId);
  const achievements = evaluateAchievements(stats);
  const earned = countEarned(achievements);
  const total = achievements.length;
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  const next = nextAchievement(achievements);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">Achievements</p>
          <p className="font-display text-xl text-wood-900 mt-1">
            {earned} of {total} badges earned
          </p>
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-honey-100 border border-honey-200 text-honey-700">
          <Award className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-honey-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {next ? (
        <p className="text-sm text-wood-600 mt-3">
          <span className="text-wood-500">Next up:</span>{" "}
          <span className="font-medium text-wood-800">{next.name}</span>
          {next.target > 1 && (
            <span className="text-wood-500">
              {" "}
              — {next.progress} / {next.target}
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-sage-700 mt-3">
          ✨ Every badge collected — amazing!
        </p>
      )}

      <Link
        href="/student/achievements"
        className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800 mt-3"
      >
        See all achievements <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}
