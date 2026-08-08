"use server";

import { revalidatePath } from "next/cache";
import { requireFullTeacher } from "@/lib/auth";
import { sendParentDigest, type SendDigestResult } from "@/lib/parent-digest-server";

export async function sendDigest(formData: FormData): Promise<SendDigestResult> {
  const user = await requireFullTeacher();

  const subject = (formData.get("subject") ?? "").toString();
  const body = (formData.get("body") ?? "").toString();
  const classIds = formData.getAll("class_ids").map((v) => v.toString());

  const result = await sendParentDigest({
    subject,
    body,
    classIds,
    senderId: user.id,
  });

  if (result.ok) revalidatePath("/teacher/parent-digest");
  return result;
}
