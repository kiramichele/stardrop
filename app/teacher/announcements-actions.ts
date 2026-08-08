"use server";

import { revalidatePath } from "next/cache";
import { requireFullTeacher } from "@/lib/auth";
import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements-server";

export async function postAnnouncement(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireFullTeacher();

  const body = (formData.get("body") ?? "").toString();
  const classIds = formData.getAll("class_ids").map((v) => v.toString());

  const result = await createAnnouncement({
    body,
    classIds,
    createdBy: user.id,
  });
  if (result.ok) {
    revalidatePath("/teacher");
    revalidatePath("/student");
  }
  return result;
}

export async function removeAnnouncement(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireFullTeacher();
  const result = await deleteAnnouncement(id);
  if (result.ok) {
    revalidatePath("/teacher");
    revalidatePath("/student");
  }
  return result;
}
