import { requireUser } from "@/lib/auth";
import { getProgramsForUser } from "@/lib/playground-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { GistEditor } from "@/components/starhub/GistEditor";

export default async function NewGistPage() {
  const user = await requireUser();
  const programs = await getProgramsForUser(user.id);
  return (
    <>
      <PageHeader
        eyebrow="StarHub"
        title="New gist"
        description="Post a code snippet to your portfolio — start from scratch or import one of your Playground programs."
      />
      <GistEditor
        context={{ mode: "create", username: user.username }}
        savedPrograms={programs}
      />
    </>
  );
}
