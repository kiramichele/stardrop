import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getProgram,
  getProgramsForUser,
} from "@/lib/playground-server";
import { getUnitySimulationEnabled } from "@/lib/app-settings-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaygroundClient } from "@/components/playground/PlaygroundClient";

export default async function PlaygroundProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const viewer = await requireUser();
  const program = await getProgram(programId);
  if (!program) notFound();

  // Owner gets their full saved list in the sidebar; visitors only see
  // the one program they came for (no leaking their library).
  const [savedPrograms, unityEnabled] = await Promise.all([
    program.user_id === viewer.id
      ? getProgramsForUser(viewer.id)
      : Promise.resolve([program]),
    getUnitySimulationEnabled(),
  ]);

  const ownerLabel =
    program.user_id === viewer.id ? null : await ownerName(program.user_id);

  return (
    <>
      <PageHeader
        eyebrow="Playground"
        title={program.title}
        description={
          ownerLabel
            ? `Shared by ${ownerLabel}. Save a copy to make it yours.`
            : "Edit, run, share."
        }
      />
      <PlaygroundClient
        savedPrograms={savedPrograms}
        initialProgram={program}
        currentUserId={viewer.id}
        unitySimulationEnabled={unityEnabled}
      />
    </>
  );
}

async function ownerName(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const first = data.first_name.trim();
  const last = data.last_name.trim();
  if (!first && !last) return null;
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}
