import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { GistEditor } from "@/components/starhub/GistEditor";

export default async function NewGistPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        eyebrow="StarHub"
        title="New gist"
        description="Post a code snippet to your portfolio — title it, add a quick caption, paste the code."
      />
      <GistEditor context={{ mode: "create", username: user.username }} />
    </>
  );
}
