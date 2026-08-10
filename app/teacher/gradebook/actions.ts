"use server";

import { revalidatePath } from "next/cache";
import { requireFullTeacher } from "@/lib/auth";
import {
  setGradeGridScore,
  setGradeGridNote,
  type GradeGridMutationResult,
} from "@/lib/grade-grid-server";

export async function updateGradeGridScore(
  studentId: string,
  assignmentId: string,
  rawScore: string
): Promise<GradeGridMutationResult> {
  await requireFullTeacher();

  const trimmed = rawScore.trim();
  const score = trimmed === "" ? null : Number.parseFloat(trimmed);
  if (score !== null && (Number.isNaN(score) || score < 0)) {
    return { ok: false, error: "Score must be 0 or higher." };
  }

  const result = await setGradeGridScore(studentId, assignmentId, score);
  if (result.ok) revalidatePath("/teacher/gradebook");
  return result;
}

export async function updateGradeGridNote(
  studentId: string,
  assignmentId: string,
  note: string
): Promise<GradeGridMutationResult> {
  await requireFullTeacher();
  const result = await setGradeGridNote(studentId, assignmentId, note.slice(0, 2000));
  if (result.ok) revalidatePath("/teacher/gradebook");
  return result;
}
