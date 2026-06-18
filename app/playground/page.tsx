import { requireUser } from "@/lib/auth";
import { getProgramsForUser } from "@/lib/playground-server";
import { getUnitySimulationEnabled } from "@/lib/app-settings-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaygroundClient } from "@/components/playground/PlaygroundClient";

export default async function PlaygroundPage() {
  const user = await requireUser();
  const [programs, unityEnabled] = await Promise.all([
    getProgramsForUser(user.id),
    getUnitySimulationEnabled(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Sandbox"
        title="Playground"
        description="Write code, run it, or have Claude tell you what it would do in Unity. Save anything worth keeping."
      />
      <PlaygroundClient
        savedPrograms={programs}
        initialProgram={null}
        currentUserId={user.id}
        unitySimulationEnabled={unityEnabled}
      />
    </>
  );
}
