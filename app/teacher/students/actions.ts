"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { setExcused } from "@/lib/excusals-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asExtendedTime } from "@/lib/assignments";
import { parseCanvasTemplate } from "@/lib/gradebook";
import {
  saveTemplate,
  clearStoredTemplate,
  syncStudentsFromTemplate,
  type RosterSyncResult,
} from "@/lib/gradebook-server";

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

const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024; // 5 MB

export type UploadTemplateResult =
  | {
      ok: true;
      studentCount: number;
      assignmentCount: number;
      sync: RosterSyncResult;
    }
  | { ok: false; error: string };

/**
 * Store a Canvas gradebook export as the export template, and create any
 * classes and students it contains that the app doesn't already have.
 */
export async function uploadGradebookTemplate(
  formData: FormData
): Promise<UploadTemplateResult> {
  const teacher = await requireTeacher();

  const file = formData.get("template");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file to upload." };
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    return { ok: false, error: "That file is too large (5 MB max)." };
  }

  const csvText = await file.text();
  const parsed = parseCanvasTemplate(csvText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const saved = await saveTemplate(file.name, csvText, teacher.id);
  if (!saved.ok) {
    return { ok: false, error: saved.error ?? "Could not save the template." };
  }

  // Template is stored; now bring the roster in line with it. A failure
  // here doesn't undo the saved template — it's surfaced in the result.
  let sync: RosterSyncResult;
  try {
    sync = await syncStudentsFromTemplate(parsed.template);
  } catch (e) {
    sync = {
      created: [],
      enrolled: 0,
      alreadyPresent: 0,
      classesCreated: [],
      errors: [e instanceof Error ? e.message : "Roster sync failed."],
    };
  }

  revalidatePath("/teacher/students");
  return {
    ok: true,
    studentCount: parsed.template.students.length,
    assignmentCount: parsed.template.assignments.length,
    sync,
  };
}

/** Remove the stored Canvas template. */
export async function clearGradebookTemplate(): Promise<void> {
  await requireTeacher();
  await clearStoredTemplate();
  revalidatePath("/teacher/students");
}

/** Update a student's SIS id and extended-time accommodation tier. */
export async function updateStudentDetails(
  studentId: string,
  formData: FormData
): Promise<void> {
  await requireTeacher();
  const rawId = (formData.get("student_id") ?? "").toString().trim();
  const extendedTime = asExtendedTime(formData.get("extended_time"));
  const admin = createAdminClient();
  await admin
    .from("users")
    .update({ student_id: rawId || null, extended_time: extendedTime })
    .eq("id", studentId);
  revalidatePath(`/teacher/students/${studentId}`);
}

const MAX_NOTE_LENGTH = 1000;

/** Pin a reminder ("sticky note") on a student. */
export async function addStudentNote(
  studentId: string,
  formData: FormData
): Promise<void> {
  const teacher = await requireTeacher();
  const body = (formData.get("body") ?? "").toString().trim();
  if (!body) return;
  const admin = createAdminClient();
  await admin.from("student_notes").insert({
    student_id: studentId,
    body: body.slice(0, MAX_NOTE_LENGTH),
    created_by: teacher.id,
  });
  revalidatePath(`/teacher/students/${studentId}`);
}

/** Remove a pinned reminder from a student. */
export async function deleteStudentNote(
  noteId: string,
  studentId: string
): Promise<void> {
  await requireTeacher();
  const admin = createAdminClient();
  await admin.from("student_notes").delete().eq("id", noteId);
  revalidatePath(`/teacher/students/${studentId}`);
}
