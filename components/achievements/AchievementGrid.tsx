"use client";

import { useEffect, useState } from "react";
import {
  Footprints,
  Sprout,
  ClipboardCheck,
  Terminal,
  Code2,
  Code,
  BookOpen,
  GraduationCap,
  Library,
  CalendarCheck,
  Flame,
  Zap,
  Star,
  Trophy,
  MessageCircle,
  MessagesSquare,
  Lock,
  Award,
  type LucideIcon,
} from "lucide-react";
import type {
  AchievementTier,
  EvaluatedAchievement,
} from "@/lib/achievements";

// String icon names (set in lib/achievements.ts) → lucide components.
// Achievements live in a client-safe module, so the icon can't travel as a
// component reference — it's resolved here instead.
const ICONS: Record<string, LucideIcon> = {
  Footprints,
  Sprout,
  ClipboardCheck,
  Terminal,
  Code2,
  Code,
  BookOpen,
  GraduationCap,
  Library,
  CalendarCheck,
  Flame,
  Zap,
  Star,
  Trophy,
  MessageCircle,
  MessagesSquare,
};

// Earned badges glow in their tier colour; locked badges sit quiet in cream.
const TIER_STYLES: Record<
  AchievementTier,
  { medallion: string; ring: string; label: string; chip: string }
> = {
  starter: {
    medallion: "bg-sage-100 text-sage-700 border-sage-200",
    ring: "border-sage-200",
    label: "text-sage-700",
    chip: "bg-sage-100 text-sage-700 border-sage-200",
  },
  skilled: {
    medallion: "bg-honey-100 text-honey-700 border-honey-200",
    ring: "border-honey-200",
    label: "text-honey-700",
    chip: "bg-honey-100 text-honey-700 border-honey-200",
  },
  star: {
    medallion: "bg-terracotta-100 text-terracotta-700 border-terracotta-200",
    ring: "border-terracotta-200",
    label: "text-terracotta-700",
    chip: "bg-terracotta-100 text-terracotta-700 border-terracotta-200",
  },
};

const TIER_LABEL: Record<AchievementTier, string> = {
  starter: "Starter",
  skilled: "Skilled",
  star: "Star",
};

const SEEN_KEY = "stardrop:seenBadges";

export function AchievementGrid({
  achievements,
}: {
  achievements: EvaluatedAchievement[];
}) {
  // Which earned badges are new since the student last visited. Computed
  // after mount from localStorage so the server render stays deterministic.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const earnedIds = achievements.filter((a) => a.earned).map((a) => a.id);
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    } catch {
      seen = [];
    }
    const seenSet = new Set(seen);
    const fresh = earnedIds.filter((id) => !seenSet.has(id));
    if (fresh.length > 0) setNewIds(new Set(fresh));
    localStorage.setItem(SEEN_KEY, JSON.stringify(earnedIds));
  }, [achievements]);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const total = achievements.length;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div className="animate-fade-in-up">
      {/* Collection progress banner */}
      <div className="bg-cream-50 rounded-cozy-lg border border-wood-100/70 shadow-cozy p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-honey-100 border border-honey-200 text-honey-700">
            <Award className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow">Badge collection</p>
            <p className="font-display text-2xl text-wood-900 leading-tight">
              {earnedCount} of {total} earned
            </p>
          </div>
          <p className="font-display text-3xl text-honey-600 flex-shrink-0">
            {pct}%
          </p>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-cream-200">
          <div
            className="h-full rounded-full bg-honey-400 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {earnedCount === total && total > 0 && (
          <p className="mt-3 text-sm text-sage-700">
            ✨ Every badge collected — wonderful work!
          </p>
        )}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {achievements.map((a) => (
          <BadgeCard
            key={a.id}
            achievement={a}
            isNew={newIds.has(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BadgeCard({
  achievement: a,
  isNew,
}: {
  achievement: EvaluatedAchievement;
  isNew: boolean;
}) {
  const tier = TIER_STYLES[a.tier];
  const Icon = ICONS[a.icon] ?? Award;

  return (
    <div
      className={[
        "relative flex flex-col items-center rounded-cozy-lg border p-5 text-center transition-shadow duration-200",
        a.earned
          ? `bg-cream-50 shadow-cozy ${tier.ring} hover:shadow-cozy-lg`
          : "bg-cream-100/60 border-wood-100",
      ].join(" ")}
    >
      {isNew && (
        <span className="absolute -top-2 -right-2 rounded-full bg-terracotta-500 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label text-cream-50 shadow-cozy">
          ✨ New
        </span>
      )}

      {/* Medallion */}
      <div
        className={[
          "flex h-16 w-16 items-center justify-center rounded-full border",
          a.earned
            ? tier.medallion
            : "bg-cream-200/70 border-wood-200 text-wood-400",
        ].join(" ")}
      >
        {a.earned ? (
          <Icon className="h-8 w-8" strokeWidth={1.75} />
        ) : (
          <Lock className="h-6 w-6" strokeWidth={1.75} />
        )}
      </div>

      {/* Tier chip */}
      <span
        className={[
          "mt-3 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide-label",
          a.earned
            ? tier.chip
            : "bg-cream-200/70 border-wood-200 text-wood-400",
        ].join(" ")}
      >
        {TIER_LABEL[a.tier]}
      </span>

      <h3
        className={[
          "font-display text-lg mt-2 leading-tight",
          a.earned ? "text-wood-900" : "text-wood-500",
        ].join(" ")}
      >
        {a.name}
      </h3>

      <p
        className={[
          "text-xs mt-1",
          a.earned ? "text-wood-600" : "text-wood-400",
        ].join(" ")}
      >
        {a.description}
      </p>

      {a.earned ? (
        <p className={`text-xs italic mt-2 ${tier.label}`}>{a.flavor}</p>
      ) : (
        <div className="mt-3 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-wood-300"
              style={{
                width: `${
                  a.target > 0
                    ? Math.round((a.progress / a.target) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[0.7rem] text-wood-400 mt-1">
            {a.progress} / {a.target}
          </p>
        </div>
      )}
    </div>
  );
}
