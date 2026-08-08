"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";
import { runAnalysis, type AnalysisResult } from "@/lib/anthropic";
import { ASSIGNMENT_TYPE_LABELS, type AssignmentType } from "@/lib/assignments";
import type { Database } from "@/types/database";

type AssignmentTypeColumn = Database["public"]["Enums"]["assignment_type"];

const PER_SUBMISSION_CHARS = 3000;

function typeLabel(type: string): string {
  return ASSIGNMENT_TYPE_LABELS[type as AssignmentType] ?? type;
}

/** Pull the analyzable text out of one submission. */
function submissionText(
  type: string,
  content: string | null,
  structuredData: unknown
): string {
  if (type === "interactive_html") {
    if (structuredData == null) return "(no response recorded)";
    return JSON.stringify(structuredData).slice(0, PER_SUBMISSION_CHARS);
  }
  if (content && content.trim()) {
    return content.slice(0, PER_SUBMISSION_CHARS);
  }
  return "(blank submission)";
}

// =============================================================
// Per-assignment: what is the class commonly struggling with?
// =============================================================

const ASSIGNMENT_SYSTEM = `You are an experienced instructional coach supporting a high school Game Design teacher. You are given one assignment and the class's submissions for it.

Identify what students are commonly struggling with — patterns that recur across multiple submissions, not one-off mistakes. Be specific and concrete, citing the kinds of mistakes you see. Then give the teacher 2-3 short, actionable teaching suggestions.

Keep the whole response concise — a teacher will skim it. Use short plain-text headings and bullet points. No markdown tables, no code fences.`;

export async function analyzeAssignment(
  assignmentId: string
): Promise<AnalysisResult> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select(
      "title, type, instructions, points, assignment_group_id, lesson_id, is_unit_quiz"
    )
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) {
    return { ok: false, error: "Assignment not found." };
  }
  if (assignment.type === "unity_upload") {
    return {
      ok: false,
      error:
        "AI analysis isn't available for Unity upload assignments — they're project files, not text.",
    };
  }

  // Analyze the WHOLE assignment across every class it was given to
  // (one copy per class), not just the copy that was picked.
  let assignmentIds = [assignmentId];
  {
    let q = admin.from("assignments").select("id");
    if (assignment.assignment_group_id) {
      q = q.eq("assignment_group_id", assignment.assignment_group_id);
    } else {
      q = q
        .eq("title", assignment.title)
        .eq("type", assignment.type)
        .eq("is_unit_quiz", assignment.is_unit_quiz);
      q = assignment.lesson_id
        ? q.eq("lesson_id", assignment.lesson_id)
        : q.is("lesson_id", null);
    }
    const { data: sibs } = await q;
    if (sibs && sibs.length > 0) assignmentIds = sibs.map((s) => s.id);
  }

  const { data: submissions } = await admin
    .from("submissions")
    .select("content, structured_data, status")
    .in("assignment_id", assignmentIds)
    .in("status", ["submitted", "graded"]);

  const rows = (submissions ?? []).slice(0, 40);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No submitted work to analyze for this assignment yet.",
    };
  }

  const body = rows
    .map(
      (s, i) =>
        `--- Student ${i + 1} ---\n${submissionText(
          assignment.type,
          s.content,
          s.structured_data
        )}`
    )
    .join("\n\n");

  const userContent = `ASSIGNMENT
Title: ${assignment.title}
Type: ${typeLabel(assignment.type)}
Points: ${assignment.points}
Instructions: ${assignment.instructions?.trim() || "(none provided)"}

SUBMISSIONS (${rows.length})
${body}`;

  return runAnalysis(ASSIGNMENT_SYSTEM, userContent);
}

// =============================================================
// Per-student: what is this student struggling with?
// =============================================================

const STUDENT_SYSTEM = `You are an experienced instructional coach supporting a high school Game Design teacher. You are given one student's submitted work across several assignments.

Identify what this student is struggling with — recurring gaps, misconceptions, or skills to work on across their work. Be specific. Then give 2-3 short, supportive, actionable suggestions for helping this student.

Keep the response concise. Use short plain-text headings and bullet points. No markdown tables, no code fences.`;

export async function analyzeStudent(
  studentId: string
): Promise<AnalysisResult> {
  await requireTeacher();
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("users")
    .select("first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) {
    return { ok: false, error: "Student not found." };
  }
  const name =
    `${student.first_name} ${student.last_name}`.trim() || "This student";

  const { data: submissions } = await admin
    .from("submissions")
    .select(
      "content, structured_data, status, assignments(title, type, points), grades(score)"
    )
    .eq("user_id", studentId)
    .in("status", ["submitted", "graded"]);

  const rows = (submissions ?? []).slice(0, 30);
  if (rows.length === 0) {
    return {
      ok: false,
      error: `${name} has no submitted work to analyze yet.`,
    };
  }

  const body = rows
    .map((s) => {
      const a = Array.isArray(s.assignments)
        ? s.assignments[0]
        : s.assignments;
      const grade = Array.isArray(s.grades) ? s.grades[0] : s.grades;
      const aType = a?.type ?? "";
      if (aType === "unity_upload") return null;
      const scoreLabel =
        grade?.score != null
          ? `score ${grade.score}/${a?.points ?? "?"}`
          : "not graded";
      return `--- ${a?.title ?? "Assignment"} (${typeLabel(
        aType
      )}, ${scoreLabel}) ---\n${submissionText(
        aType,
        s.content,
        s.structured_data
      )}`;
    })
    .filter((x): x is string => x !== null);

  if (body.length === 0) {
    return {
      ok: false,
      error: `${name}'s submitted work can't be analyzed by AI (Unity uploads only).`,
    };
  }

  const userContent = `STUDENT: ${name}

WORK (${body.length} submissions)
${body.join("\n\n")}`;

  return runAnalysis(STUDENT_SYSTEM, userContent);
}

// =============================================================
// Mastery heatmap: for each picked assignment, AI-rated mastery per
// class section. Rows = assignments, columns = classes.
// =============================================================

export type MasteryBand =
  | "exceeding"
  | "meeting"
  | "approaching"
  | "below"
  | "insufficient_evidence";

export type MasteryCell = {
  classId: string;
  mastery: MasteryBand;
  note: string;
};

export type MasteryRow =
  | {
      assignmentId: string;
      assignmentTitle: string;
      ok: true;
      cells: MasteryCell[];
    }
  | { assignmentId: string; assignmentTitle: string; ok: false; error: string };

export type MasteryHeatmapResult =
  | { ok: true; rows: MasteryRow[] }
  | { ok: false; error: string };

const MASTERY_SAMPLES_PER_CLASS = 6;
const MASTERY_CHARS_PER_SUBMISSION = 1200;
const MASTERY_BANDS: MasteryBand[] = [
  "exceeding",
  "meeting",
  "approaching",
  "below",
  "insufficient_evidence",
];

const MASTERY_SYSTEM = `You are an experienced instructional coach helping a high school Game Design teacher gauge whole-class mastery on one assignment, broken down by class section.

You'll get the assignment (title, type, instructions, points) and, for each class section, a sample of that section's submissions.

For EACH class section given, pick ONE overall mastery band:
- "exceeding" — most students show mastery beyond what was asked
- "meeting" — most students meet the assignment's expectations
- "approaching" — most students show partial understanding with real gaps
- "below" — most students show minimal understanding
- "insufficient_evidence" — too few submissions, or blank/unscoreable work

Then write a one-sentence note (under 20 words) citing something concrete you saw.

Respond with ONLY minified JSON, no prose, no markdown fences, exactly this shape:
{"classes":[{"classIndex":0,"mastery":"meeting","note":"..."}]}

Include exactly one entry per class section you were given, in order, using the 0-based classIndex it was labeled with.`;

/** Extract the first {...} block from a string and JSON.parse it. */
function parseJsonBlock(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in the response.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

/** Resolve every class-copy of `assignmentId` (same logic as analyzeAssignment). */
async function resolveSiblingAssignments(
  admin: ReturnType<typeof createAdminClient>,
  assignment: {
    id: string;
    title: string;
    type: AssignmentTypeColumn;
    lesson_id: string | null;
    is_unit_quiz: boolean;
    assignment_group_id: string | null;
  }
): Promise<{ id: string; class_id: string }[]> {
  let q = admin.from("assignments").select("id, class_id");
  if (assignment.assignment_group_id) {
    q = q.eq("assignment_group_id", assignment.assignment_group_id);
  } else {
    q = q
      .eq("title", assignment.title)
      .eq("type", assignment.type)
      .eq("is_unit_quiz", assignment.is_unit_quiz);
    q = assignment.lesson_id
      ? q.eq("lesson_id", assignment.lesson_id)
      : q.is("lesson_id", null);
  }
  const { data } = await q;
  return data && data.length > 0 ? data : [{ id: assignment.id, class_id: "" }];
}

async function rateMasteryForAssignment(
  admin: ReturnType<typeof createAdminClient>,
  assignmentId: string,
  classes: { id: string; label: string }[]
): Promise<MasteryRow> {
  const { data: assignment } = await admin
    .from("assignments")
    .select(
      "title, type, instructions, points, assignment_group_id, lesson_id, is_unit_quiz"
    )
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) {
    return {
      assignmentId,
      assignmentTitle: "Assignment",
      ok: false,
      error: "Assignment not found.",
    };
  }
  if (assignment.type === "unity_upload") {
    return {
      assignmentId,
      assignmentTitle: assignment.title,
      ok: false,
      error: "Unity upload assignments are project files, not text — skip.",
    };
  }

  const siblings = await resolveSiblingAssignments(admin, {
    id: assignmentId,
    ...assignment,
  });
  const siblingByClass = new Map(siblings.map((s) => [s.class_id, s.id]));
  const siblingIds = siblings.map((s) => s.id);

  const { data: submissions } = await admin
    .from("submissions")
    .select("assignment_id, content, structured_data, status")
    .in("assignment_id", siblingIds)
    .in("status", ["submitted", "graded"]);

  const subsBySibling = new Map<string, typeof submissions>();
  for (const s of submissions ?? []) {
    const arr = subsBySibling.get(s.assignment_id) ?? [];
    arr.push(s);
    subsBySibling.set(s.assignment_id, arr);
  }

  // Only classes this assignment actually reaches, and that have at least
  // one submission — everyone else is a plain "not assigned" cell, no AI
  // call spent on them.
  const applicable = classes
    .map((c, classIndex) => ({
      classIndex,
      classId: c.id,
      label: c.label,
      siblingId: siblingByClass.get(c.id),
    }))
    .filter((c) => c.siblingId && (subsBySibling.get(c.siblingId!)?.length ?? 0) > 0);

  if (applicable.length === 0) {
    return { assignmentId, assignmentTitle: assignment.title, ok: true, cells: [] };
  }

  const sections = applicable
    .map((c, i) => {
      const rows = (subsBySibling.get(c.siblingId!) ?? []).slice(
        0,
        MASTERY_SAMPLES_PER_CLASS
      );
      const chars = MASTERY_CHARS_PER_SUBMISSION;
      const body = rows
        .map((s, j) => {
          const text =
            assignment.type === "interactive_html"
              ? s.structured_data == null
                ? "(no response recorded)"
                : JSON.stringify(s.structured_data).slice(0, chars)
              : s.content?.trim()
                ? s.content.slice(0, chars)
                : "(blank submission)";
          return `Student ${j + 1}: ${text}`;
        })
        .join("\n");
      return `--- Class ${i} (${rows.length} submissions sampled) ---\n${body}`;
    })
    .join("\n\n");

  const userContent = `ASSIGNMENT
Title: ${assignment.title}
Type: ${typeLabel(assignment.type)}
Points: ${assignment.points}
Instructions: ${assignment.instructions?.trim() || "(none provided)"}

CLASS SECTIONS
${sections}`;

  const result = await runAnalysis(MASTERY_SYSTEM, userContent);
  if (!result.ok) {
    return { assignmentId, assignmentTitle: assignment.title, ok: false, error: result.error };
  }

  try {
    const parsed = parseJsonBlock(result.text) as {
      classes?: { classIndex: number; mastery: string; note: string }[];
    };
    const byIndex = new Map((parsed.classes ?? []).map((c) => [c.classIndex, c]));
    const cells: MasteryCell[] = applicable.map((c, i) => {
      const entry = byIndex.get(i);
      const mastery =
        entry && MASTERY_BANDS.includes(entry.mastery as MasteryBand)
          ? (entry.mastery as MasteryBand)
          : "insufficient_evidence";
      return {
        classId: c.classId,
        mastery,
        note: entry?.note?.trim() || "No note returned.",
      };
    });
    return { assignmentId, assignmentTitle: assignment.title, ok: true, cells };
  } catch {
    return {
      assignmentId,
      assignmentTitle: assignment.title,
      ok: false,
      error: "Couldn't parse the AI's response — try again.",
    };
  }
}

/**
 * Rate mastery per class section for each picked assignment. Runs one AI
 * call per assignment (sequentially, to stay gentle on rate limits), each
 * covering every class the assignment reaches in a single pass.
 */
export async function generateMasteryHeatmap(
  assignmentIds: string[]
): Promise<MasteryHeatmapResult> {
  await requireTeacher();
  if (assignmentIds.length === 0) {
    return { ok: false, error: "Pick at least one assignment first." };
  }
  if (assignmentIds.length > 10) {
    return {
      ok: false,
      error: "Pick 10 or fewer assignments at a time — each one runs its own AI pass.",
    };
  }

  const admin = createAdminClient();
  const { data: classesData } = await admin
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });
  const classes = (classesData ?? []).map((c) => ({
    id: c.id,
    label: c.period_number != null ? `P${c.period_number}` : c.name,
  }));

  const rows: MasteryRow[] = [];
  for (const id of assignmentIds) {
    rows.push(await rateMasteryForAssignment(admin, id, classes));
  }

  return { ok: true, rows };
}
