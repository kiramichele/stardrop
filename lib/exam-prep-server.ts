import { createAdminClient } from "@/lib/supabase/admin";
import type {
  GlossaryTerm,
  ExamQuestion,
  CodeExample,
  QuizMode,
} from "@/lib/exam-prep";
import {
  SEED_GLOSSARY,
  SEED_QUESTIONS,
  SEED_CODE_EXAMPLES,
} from "@/lib/exam-prep/seed-data";

// Server-only data layer for the exam-prep section. Admin-client based —
// every caller is a requireUser()-gated route (same pattern as `assets`).

const CHOICE_INDEX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("glossary_terms")
    .select("id, term, definition")
    .order("term");
  return (data ?? []).map((t) => ({
    id: t.id,
    term: t.term,
    definition: t.definition,
  }));
}

export async function getExamQuestions(): Promise<ExamQuestion[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("exam_questions")
    .select(
      "id, question, choice_a, choice_b, choice_c, choice_d, correct, explanation, category"
    )
    .order("created_at");
  return (data ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
    correctIndex: CHOICE_INDEX[q.correct] ?? 0,
    explanation: q.explanation,
    category: q.category,
  }));
}

export async function getCodeExamples(): Promise<CodeExample[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("code_examples")
    .select("id, title, description, code, category")
    .order("category")
    .order("title");
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    code: c.code,
    category: c.category,
  }));
}

export type ExamPrepCounts = {
  terms: number;
  questions: number;
  examples: number;
};

export async function getExamPrepCounts(): Promise<ExamPrepCounts> {
  const admin = createAdminClient();
  const [terms, questions, examples] = await Promise.all([
    admin.from("glossary_terms").select("id", { count: "exact", head: true }),
    admin.from("exam_questions").select("id", { count: "exact", head: true }),
    admin.from("code_examples").select("id", { count: "exact", head: true }),
  ]);
  return {
    terms: terms.count ?? 0,
    questions: questions.count ?? 0,
    examples: examples.count ?? 0,
  };
}

export type QuizStats = {
  /** Best score as a percentage, or null when never attempted. */
  quizBest: number | null;
  examBest: number | null;
  attempts: number;
};

export async function getQuizStats(userId: string): Promise<QuizStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quiz_attempts")
    .select("mode, score, total")
    .eq("user_id", userId);

  let quizBest: number | null = null;
  let examBest: number | null = null;
  for (const a of data ?? []) {
    if (a.total <= 0) continue;
    const pct = (a.score / a.total) * 100;
    if (a.mode === "exam") {
      examBest = examBest === null ? pct : Math.max(examBest, pct);
    } else {
      quizBest = quizBest === null ? pct : Math.max(quizBest, pct);
    }
  }
  return { quizBest, examBest, attempts: (data ?? []).length };
}

export async function recordQuizAttempt(
  userId: string,
  mode: QuizMode,
  score: number,
  total: number
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("quiz_attempts")
    .insert({ user_id: userId, mode, score, total });
}

/** Load the starter content into any of the three tables that are empty. */
export async function seedExamPrepContent(): Promise<ExamPrepCounts> {
  const admin = createAdminClient();
  const counts = await getExamPrepCounts();
  const added: ExamPrepCounts = { terms: 0, questions: 0, examples: 0 };

  if (counts.terms === 0) {
    const { error } = await admin.from("glossary_terms").insert(SEED_GLOSSARY);
    if (!error) added.terms = SEED_GLOSSARY.length;
  }
  if (counts.questions === 0) {
    const { error } = await admin
      .from("exam_questions")
      .insert(SEED_QUESTIONS);
    if (!error) added.questions = SEED_QUESTIONS.length;
  }
  if (counts.examples === 0) {
    const { error } = await admin
      .from("code_examples")
      .insert(SEED_CODE_EXAMPLES);
    if (!error) added.examples = SEED_CODE_EXAMPLES.length;
  }
  return added;
}
