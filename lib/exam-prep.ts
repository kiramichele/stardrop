// Client-safe: exam-prep types, constants, and pure helpers. No supabase
// or next/headers imports — both Client and Server Components use this.

export type QuizMode = "quiz" | "exam";

/** How many questions a gamified quiz round pulls from the bank. */
export const QUIZ_LENGTH = 10;

/** Question-bank categories, used for grouping and filters. */
export const EXAM_CATEGORIES = [
  "Scripting & C#",
  "GameObjects & Components",
  "Physics & Collision",
  "Unity Editor",
  "UI & Animation",
] as const;

export type GlossaryTerm = {
  id: string;
  term: string;
  definition: string;
};

/** A multiple-choice question, shaped for the quiz UI. */
export type ExamQuestion = {
  id: string;
  question: string;
  /** The four answer choices, in order. */
  choices: string[];
  /** Index (0-3) of the correct choice. */
  correctIndex: number;
  explanation: string;
  category: string;
};

export type CodeExample = {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
};

/** Fisher-Yates shuffle — returns a new array, leaves the input alone. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A short verdict for a quiz/exam percentage. */
export function scoreBand(pct: number): { label: string; pass: boolean } {
  if (pct >= 90) return { label: "Excellent", pass: true };
  if (pct >= 75) return { label: "On track", pass: true };
  if (pct >= 60) return { label: "Getting there", pass: false };
  return { label: "Keep studying", pass: false };
}
