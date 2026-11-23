import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSceneRow } from "@/lib/unity-lab-server";
import { getUnitySimulationEnabled } from "@/lib/app-settings-server";
import { sanitizeScene } from "@/lib/unity-lab/scene";
import { UnityLabEditor } from "@/components/unity-lab/UnityLabEditor";

// Play waits on an AI simulation, which can take up to a minute or so.
// Server actions inherit the page's limit.
export const maxDuration = 120;

export default async function UnityLabScenePage({
  params,
}: {
  params: Promise<{ sceneId: string }>;
}) {
  const { sceneId } = await params;
  const user = await requireUser();
  const row = await getSceneRow(sceneId);
  if (!row || row.user_id !== user.id) notFound();

  const clean = sanitizeScene(row.scene);
  if ("error" in clean) notFound();

  return (
    <UnityLabEditor
      sceneId={row.id}
      initialTitle={row.title}
      initialScene={clean.scene}
      simulationEnabled={await getUnitySimulationEnabled()}
    />
  );
}
