"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUnitySimulationEnabled } from "@/lib/app-settings-server";
import {
  MAX_TITLE_CHARS,
  defaultScene,
  sanitizeScene,
} from "@/lib/unity-lab/scene";
import { MAX_SCENARIO_CHARS, type SimulationResult } from "@/lib/unity-lab/simulation";
import {
  RUNS_PER_HOUR,
  claimRun,
  deleteSceneRow,
  getSceneRow,
  insertScene,
  listScenes,
  runSimulation,
  updateSceneRow,
} from "@/lib/unity-lab-server";

/** Load a scene and confirm the signed-in user owns it. */
async function ownScene(sceneId: string) {
  const user = await requireUser();
  const row = await getSceneRow(sceneId);
  if (!row || row.user_id !== user.id) return null;
  return { user, row };
}

/** Form action: create a starter scene and open it. */
export async function createScene(): Promise<void> {
  const user = await requireUser();
  const existing = await listScenes(user.id);
  const titles = new Set(existing.map((s) => s.title));
  let title = "My Scene";
  for (let i = 2; titles.has(title); i++) title = `My Scene ${i}`;

  const result = await insertScene(user.id, title, defaultScene());
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/unity-lab");
  redirect(`/unity-lab/${result.id}`);
}

export async function saveScene(
  sceneId: string,
  args: { title: string; scene: unknown }
): Promise<{ ok: boolean; error?: string }> {
  const owned = await ownScene(sceneId);
  if (!owned) return { ok: false, error: "Scene not found" };

  const title = args.title.trim().slice(0, MAX_TITLE_CHARS);
  if (!title) return { ok: false, error: "Give the scene a name." };
  const clean = sanitizeScene(args.scene);
  if ("error" in clean) return { ok: false, error: clean.error };

  const result = await updateSceneRow(sceneId, { title, scene: clean.scene });
  if (result.ok) revalidatePath("/unity-lab");
  return result;
}

export async function deleteScene(sceneId: string): Promise<{ ok: boolean; error?: string }> {
  const owned = await ownScene(sceneId);
  if (!owned) return { ok: false, error: "Scene not found" };
  const result = await deleteSceneRow(sceneId);
  if (result.ok) revalidatePath("/unity-lab");
  return result;
}

export type SimulateResponse =
  | { ok: true; result: SimulationResult }
  | { ok: false; error: string };

/** Play: ask Claude what this scene would do in Unity. */
export async function simulateScene(
  sceneId: string,
  args: { scene: unknown; scenario: string }
): Promise<SimulateResponse> {
  const owned = await ownScene(sceneId);
  if (!owned) return { ok: false, error: "Scene not found" };

  if (!(await getUnitySimulationEnabled())) {
    return { ok: false, error: "Unity simulation is currently turned off by your teacher." };
  }

  const clean = sanitizeScene(args.scene);
  if ("error" in clean) return { ok: false, error: clean.error };
  if (clean.scene.objects.length === 0) {
    return { ok: false, error: "Add a GameObject to the scene first." };
  }

  if (!(await claimRun(owned.user.id))) {
    return {
      ok: false,
      error: `You've pressed Play ${RUNS_PER_HOUR} times in the last hour — take a breather and try again soon.`,
    };
  }

  return runSimulation(clean.scene, args.scenario.slice(0, MAX_SCENARIO_CHARS));
}
