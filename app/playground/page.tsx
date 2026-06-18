import { requireUser } from "@/lib/auth";
import { getProgramsForUser } from "@/lib/playground-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaygroundClient } from "@/components/playground/PlaygroundClient";

export default async function PlaygroundPage() {
  const user = await requireUser();
  const programs = await getProgramsForUser(user.id);

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
      />
    </>
  );
}
