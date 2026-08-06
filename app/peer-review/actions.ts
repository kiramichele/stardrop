"use server";

import { revalidatePath } from "next/cache";
import { requireFullTeacher, requireStudent } from "@/lib/auth";
import {
  randomizePairs as doRandomize,
  autoAssignUnpaired as doAutoAssign,
  setManualPair as doManualPair,
  unpairStudent as doUnpair,
  submitPeerFeedback as doSubmit,
} from "@/lib/peer-review-server";

// --- Teacher: pairing board ---------------------------------

export async function randomizePairs(assignmentId: string) {
  await requireFullTeacher();
  const r = await doRandomize(assignmentId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return r;
}

export async function autoAssignUnpaired(assignmentId: string) {
  await requireFullTeacher();
  const r = await doAutoAssign(assignmentId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return r;
}

export async function setManualPair(
  assignmentId: string,
  aId: string,
  bId: string
) {
  await requireFullTeacher();
  const r = await doManualPair(assignmentId, aId, bId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return r;
}

export async function unpairStudent(assignmentId: string, userId: string) {
  await requireFullTeacher();
  const r = await doUnpair(assignmentId, userId);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  return r;
}

// --- Student: submit feedback -------------------------------

export async function submitPeerFeedback(assignmentId: string, body: string) {
  const user = await requireStudent();
  const r = await doSubmit(assignmentId, user.id, body);
  revalidatePath(`/student/assignments/${assignmentId}`);
  return r;
}
