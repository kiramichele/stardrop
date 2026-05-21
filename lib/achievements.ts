// Client-safe: achievement definitions and pure evaluation logic.
// Client Components (the badge grid) import this, so keep it free of any
// server-only imports. Server-side stat gathering lives in
// lib/achievements-server.ts.

export type AchievementTier = "starter" | "skilled" | "star";

/**
 * Everything an achievement needs to decide whether it's earned. Gathered
 * once per student by getStudentAchievementStats (achievements-server.ts).
 */
export type StudentStats = {
  /** Assignments turned in (status submitted or graded). */
  submissions: number;
  /** Total non-blank lines across every code submission. */
  linesOfCode: number;
  /** Lessons marked complete. */
  lessonsCompleted: number;
  /** Units where every published lesson is complete. */
  unitsCleared: number;
  /** Longest run of consecutive days with any activity. */
  longestStreak: number;
  /** Graded assignments scored at full marks. */
  perfectScores: number;
  /** Average score percent across graded work (0-100). */
  averagePct: number;
  /** How many assignments have a grade — context for averagePct. */
  gradedCount: number;
  /** Discussion posts written (not deleted). */
  discussionPosts: number;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  /** A cozy one-liner shown once the badge is earned. */
  flavor: string;
  /** lucide-react icon name — resolved to a component in the badge grid. */
  icon: string;
  tier: AchievementTier;
  /** Earned state plus progress toward the badge's target. */
  evaluate: (s: StudentStats) => {
    earned: boolean;
    progress: number;
    target: number;
  };
};

export type EvaluatedAchievement = Achievement & {
  earned: boolean;
  progress: number;
  target: number;
};

/** Standard "reach N of something" check used by most badges. */
function reach(value: number, target: number) {
  return {
    earned: value >= target,
    progress: Math.min(Math.max(value, 0), target),
    target,
  };
}

/**
 * The badge collection. Order is stable — the grid renders them in this
 * order so a student's collection layout never shifts as they earn more.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Turn in your very first assignment.",
    flavor: "Every journey starts with a single submission.",
    icon: "Footprints",
    tier: "starter",
    evaluate: (s) => reach(s.submissions, 1),
  },
  {
    id: "getting-the-hang",
    name: "Getting the Hang of It",
    description: "Turn in 5 assignments.",
    flavor: "You're finding your rhythm.",
    icon: "Sprout",
    tier: "starter",
    evaluate: (s) => reach(s.submissions, 5),
  },
  {
    id: "busy-bee",
    name: "Busy Bee",
    description: "Turn in 20 assignments.",
    flavor: "Twenty done — that's a tidy little harvest.",
    icon: "ClipboardCheck",
    tier: "skilled",
    evaluate: (s) => reach(s.submissions, 20),
  },
  {
    id: "hello-world",
    name: "Hello, World",
    description: "Write your first line of code.",
    flavor: "It compiles in your heart.",
    icon: "Terminal",
    tier: "starter",
    evaluate: (s) => reach(s.linesOfCode, 1),
  },
  {
    id: "century",
    name: "Century",
    description: "Write 100 lines of code.",
    flavor: "One hundred lines, one growing developer.",
    icon: "Code2",
    tier: "skilled",
    evaluate: (s) => reach(s.linesOfCode, 100),
  },
  {
    id: "code-marathon",
    name: "Code Marathon",
    description: "Write 500 lines of code.",
    flavor: "Half a thousand lines. Your keyboard is well-loved.",
    icon: "Code",
    tier: "star",
    evaluate: (s) => reach(s.linesOfCode, 500),
  },
  {
    id: "bookworm",
    name: "Bookworm",
    description: "Complete your first lesson.",
    flavor: "Curiosity, one page at a time.",
    icon: "BookOpen",
    tier: "starter",
    evaluate: (s) => reach(s.lessonsCompleted, 1),
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Complete 10 lessons.",
    flavor: "Ten lessons deep and still going.",
    icon: "GraduationCap",
    tier: "skilled",
    evaluate: (s) => reach(s.lessonsCompleted, 10),
  },
  {
    id: "unit-cleared",
    name: "Unit Cleared",
    description: "Finish every lesson in a unit.",
    flavor: "A whole unit, start to finish. Lovely work.",
    icon: "Library",
    tier: "skilled",
    evaluate: (s) => reach(s.unitsCleared, 1),
  },
  {
    id: "two-in-a-row",
    name: "Two in a Row",
    description: "Be active two days in a row.",
    flavor: "Showing up again — that's how habits start.",
    icon: "CalendarCheck",
    tier: "starter",
    evaluate: (s) => reach(s.longestStreak, 2),
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Keep a 7-day activity streak.",
    flavor: "Seven days straight. Rain or shine.",
    icon: "Flame",
    tier: "skilled",
    evaluate: (s) => reach(s.longestStreak, 7),
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Keep a 14-day activity streak.",
    flavor: "Two solid weeks. Nothing can slow you down.",
    icon: "Zap",
    tier: "star",
    evaluate: (s) => reach(s.longestStreak, 14),
  },
  {
    id: "top-marks",
    name: "Top Marks",
    description: "Score full points on an assignment.",
    flavor: "A perfect score — polished to a shine.",
    icon: "Star",
    tier: "skilled",
    evaluate: (s) => reach(s.perfectScores, 1),
  },
  {
    id: "honor-roll",
    name: "Honor Roll",
    description: "Hold a 90%+ average across at least 3 graded assignments.",
    flavor: "Steady, careful work — and it shows.",
    icon: "Trophy",
    tier: "star",
    evaluate: (s) => ({
      earned: s.gradedCount >= 3 && s.averagePct >= 90,
      progress: Math.min(s.averagePct, 90),
      target: 90,
    }),
  },
  {
    id: "speaking-up",
    name: "Speaking Up",
    description: "Write your first discussion post.",
    flavor: "Your voice belongs in the conversation.",
    icon: "MessageCircle",
    tier: "starter",
    evaluate: (s) => reach(s.discussionPosts, 1),
  },
  {
    id: "class-voice",
    name: "Class Voice",
    description: "Write 10 discussion posts.",
    flavor: "Ten posts in — the class is better for it.",
    icon: "MessagesSquare",
    tier: "skilled",
    evaluate: (s) => reach(s.discussionPosts, 10),
  },
];

/** Run every achievement against a student's stats. */
export function evaluateAchievements(
  stats: StudentStats
): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map((a) => ({ ...a, ...a.evaluate(stats) }));
}

/** How many of the evaluated achievements are earned. */
export function countEarned(list: EvaluatedAchievement[]): number {
  return list.filter((a) => a.earned).length;
}

/**
 * The locked badge a student is closest to earning — handy for a gentle
 * "next up" nudge. Prefers the one with the highest progress ratio; among
 * untouched badges, the earliest in the list wins. Returns null when every
 * badge is earned.
 */
export function nextAchievement(
  list: EvaluatedAchievement[]
): EvaluatedAchievement | null {
  const locked = list.filter((a) => !a.earned);
  if (locked.length === 0) return null;
  return locked.reduce((best, a) => {
    const ratio = a.target > 0 ? a.progress / a.target : 0;
    const bestRatio = best.target > 0 ? best.progress / best.target : 0;
    return ratio > bestRatio ? a : best;
  });
}
