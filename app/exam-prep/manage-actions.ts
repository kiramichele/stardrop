"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Teacher content management for the exam-prep section — create, edit,
// delete, and CSV import for the glossary, question bank, and code
// examples. Every action is requireTeacher()-gated.

const EXAM_PREP_PATHS = [
  "/exam-prep",
  "/exam-prep/glossary",
  "/exam-prep/flashcards",
  "/exam-prep/quiz",
  "/exam-prep/exam",
  "/exam-prep/code",
];

function revalidateExamPrep() {
  for (const path of EXAM_PREP_PATHS) revalidatePath(path);
}

export type ImportResult = { added: number; errors: string[] };

function field(fd: FormData, name: string): string {
  return (fd.get(name) ?? "").toString().trim();
}

// =============================================================
// Glossary terms
// =============================================================

export async function createGlossaryTerm(fd: FormData): Promise<void> {
  await requireTeacher();
  const term = field(fd, "term");
  const definition = field(fd, "definition");
  if (!term || !definition) return;
  await createAdminClient().from("glossary_terms").insert({ term, definition });
  revalidateExamPrep();
}

export async function updateGlossaryTerm(
  id: string,
  fd: FormData
): Promise<void> {
  await requireTeacher();
  const term = field(fd, "term");
  const definition = field(fd, "definition");
  if (!term || !definition) return;
  await createAdminClient()
    .from("glossary_terms")
    .update({ term, definition })
    .eq("id", id);
  revalidateExamPrep();
}

export async function deleteGlossaryTerm(id: string): Promise<void> {
  await requireTeacher();
  await createAdminClient().from("glossary_terms").delete().eq("id", id);
  revalidateExamPrep();
}

export async function importGlossaryCsv(
  csvText: string
): Promise<ImportResult> {
  await requireTeacher();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: { term: string; definition: string }[] = [];
  const errors: string[] = [];
  parsed.data.forEach((r, i) => {
    const term = (r.term ?? "").trim();
    const definition = (r.definition ?? "").trim();
    if (!term || !definition) {
      errors.push(`Row ${i + 2}: term and definition are both required.`);
      return;
    }
    rows.push({ term, definition });
  });

  let added = 0;
  if (rows.length > 0) {
    const { error } = await createAdminClient()
      .from("glossary_terms")
      .insert(rows);
    if (error) errors.push(error.message);
    else added = rows.length;
  }
  revalidateExamPrep();
  return { added, errors };
}

// =============================================================
// Exam questions
// =============================================================

type QuestionInput = {
  question: string;
  code: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct: string;
  explanation: string;
  category: string;
};

// A blank value, or one of these placeholders, means "no code part".
const NO_CODE_VALUES = new Set(["", "none", "n/a", "na", "-"]);

function normalizeCode(raw: string): string {
  const trimmed = raw.trim();
  return NO_CODE_VALUES.has(trimmed.toLowerCase()) ? "" : trimmed;
}

function readQuestion(fd: FormData): QuestionInput {
  const correct = field(fd, "correct").toLowerCase();
  return {
    question: field(fd, "question"),
    code: normalizeCode((fd.get("code") ?? "").toString()),
    choice_a: field(fd, "choice_a"),
    choice_b: field(fd, "choice_b"),
    choice_c: field(fd, "choice_c"),
    choice_d: field(fd, "choice_d"),
    correct: ["a", "b", "c", "d"].includes(correct) ? correct : "a",
    explanation: field(fd, "explanation"),
    category: field(fd, "category") || "General",
  };
}

function questionComplete(q: QuestionInput): boolean {
  return !!(
    q.question &&
    q.choice_a &&
    q.choice_b &&
    q.choice_c &&
    q.choice_d
  );
}

export async function createQuestion(fd: FormData): Promise<void> {
  await requireTeacher();
  const q = readQuestion(fd);
  if (!questionComplete(q)) return;
  await createAdminClient().from("exam_questions").insert(q);
  revalidateExamPrep();
}

export async function updateQuestion(
  id: string,
  fd: FormData
): Promise<void> {
  await requireTeacher();
  const q = readQuestion(fd);
  if (!questionComplete(q)) return;
  await createAdminClient().from("exam_questions").update(q).eq("id", id);
  revalidateExamPrep();
}

export async function deleteQuestion(id: string): Promise<void> {
  await requireTeacher();
  await createAdminClient().from("exam_questions").delete().eq("id", id);
  revalidateExamPrep();
}

export async function importQuestionsCsv(
  csvText: string
): Promise<ImportResult> {
  await requireTeacher();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: QuestionInput[] = [];
  const errors: string[] = [];
  parsed.data.forEach((r, i) => {
    const row: QuestionInput = {
      question: (r.question ?? "").trim(),
      code: normalizeCode((r.code ?? "").toString()),
      choice_a: (r.choice_a ?? "").trim(),
      choice_b: (r.choice_b ?? "").trim(),
      choice_c: (r.choice_c ?? "").trim(),
      choice_d: (r.choice_d ?? "").trim(),
      correct: (r.correct ?? "").trim().toLowerCase(),
      explanation: (r.explanation ?? "").trim(),
      category: (r.category ?? "").trim() || "General",
    };
    if (!questionComplete(row)) {
      errors.push(
        `Row ${i + 2}: question and all four choices are required.`
      );
      return;
    }
    if (!["a", "b", "c", "d"].includes(row.correct)) {
      errors.push(`Row ${i + 2}: "correct" must be a, b, c, or d.`);
      return;
    }
    rows.push(row);
  });

  let added = 0;
  if (rows.length > 0) {
    const { error } = await createAdminClient()
      .from("exam_questions")
      .insert(rows);
    if (error) errors.push(error.message);
    else added = rows.length;
  }
  revalidateExamPrep();
  return { added, errors };
}

// =============================================================
// Code examples
// =============================================================

export async function createCodeExample(fd: FormData): Promise<void> {
  await requireTeacher();
  const title = field(fd, "title");
  const code = (fd.get("code") ?? "").toString();
  if (!title || !code.trim()) return;
  await createAdminClient().from("code_examples").insert({
    title,
    description: field(fd, "description"),
    code,
    category: field(fd, "category") || "General",
  });
  revalidateExamPrep();
}

export async function updateCodeExample(
  id: string,
  fd: FormData
): Promise<void> {
  await requireTeacher();
  const title = field(fd, "title");
  const code = (fd.get("code") ?? "").toString();
  if (!title || !code.trim()) return;
  await createAdminClient()
    .from("code_examples")
    .update({
      title,
      description: field(fd, "description"),
      code,
      category: field(fd, "category") || "General",
    })
    .eq("id", id);
  revalidateExamPrep();
}

export async function deleteCodeExample(id: string): Promise<void> {
  await requireTeacher();
  await createAdminClient().from("code_examples").delete().eq("id", id);
  revalidateExamPrep();
}

export async function importCodeExamplesCsv(
  csvText: string
): Promise<ImportResult> {
  await requireTeacher();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: {
    title: string;
    description: string;
    code: string;
    category: string;
  }[] = [];
  const errors: string[] = [];
  parsed.data.forEach((r, i) => {
    const title = (r.title ?? "").trim();
    const code = (r.code ?? "").toString().trim();
    if (!title || !code) {
      errors.push(`Row ${i + 2}: title and code are both required.`);
      return;
    }
    rows.push({
      title,
      description: (r.description ?? "").trim(),
      code,
      category: (r.category ?? "").trim() || "General",
    });
  });

  let added = 0;
  if (rows.length > 0) {
    const { error } = await createAdminClient()
      .from("code_examples")
      .insert(rows);
    if (error) errors.push(error.message);
    else added = rows.length;
  }
  revalidateExamPrep();
  return { added, errors };
}
