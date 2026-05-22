"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";
import { runAnalysis, type AnalysisResult } from "@/lib/anthropic";
import { ASSIGNMENT_TYPE_LABELS, type AssignmentType } from "@/lib/assignments";

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
    .select("title, type, instructions, points")
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

  const { data: submissions } = await admin
    .from("submissions")
    .select("content, structured_data, status")
    .eq("assignment_id", assignmentId)
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
