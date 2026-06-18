"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { setUnitySimulationEnabled } from "@/lib/app-settings-server";

export async function toggleUnitySimulation(
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacher();
  try {
    await setUnitySimulationEnabled(enabled);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't update setting.",
    };
  }
  // Anywhere that reads the flag — both the settings page and the
  // student-facing run surfaces.
  revalidatePath("/teacher/settings");
  revalidatePath("/playground");
  revalidatePath("/playground/[programId]", "page");
  revalidatePath("/student/assignments/[assignmentId]", "page");
  return { ok: true };
}
