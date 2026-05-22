"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireTeacher } from "@/lib/auth";
import {
  recordQuizAttempt,
  seedExamPrepContent,
  type ExamPrepCounts,
} from "@/lib/exam-prep-server";
import type { QuizMode } from "@/lib/exam-prep";

/** Record a finished quiz or practice exam for the current student. */
export async function saveQuizAttempt(
  mode: QuizMode,
  score: number,
  total: number,
  durationSeconds: number
): Promise<void> {
  const user = await requireUser();
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return;
  await recordQuizAttempt(
    user.id,
    mode,
    Math.max(0, Math.min(Math.round(score), Math.round(total))),
    Math.round(total),
    Number.isFinite(durationSeconds)
      ? Math.max(0, Math.round(durationSeconds))
      : 0
  );
  revalidatePath("/exam-prep");
  revalidatePath("/exam-prep/quiz");
}

/** Teacher action: load the Unity-cert starter content into the database. */
export async function loadStarterContent(): Promise<ExamPrepCounts> {
  await requireTeacher();
  const added = await seedExamPrepContent();
  for (const path of [
    "/exam-prep",
    "/exam-prep/glossary",
    "/exam-prep/flashcards",
    "/exam-prep/quiz",
    "/exam-prep/exam",
    "/exam-prep/code",
  ]) {
    revalidatePath(path);
  }
  return added;
}
