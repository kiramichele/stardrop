"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { setExcused } from "@/lib/excusals-server";

/** Excuse or un-excuse a student from a single assignment. */
export async function setAssignmentExcused(
  assignmentId: string,
  studentId: string,
  excused: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireTeacher();
  const result = await setExcused(assignmentId, studentId, excused);
  if (result.ok) {
    revalidatePath(`/teacher/students/${studentId}`);
    revalidatePath("/teacher/analytics");
  }
  return result;
}
