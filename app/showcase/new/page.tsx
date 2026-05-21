import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectUploadForm } from "@/components/showcase/ProjectUploadForm";

export default async function NewShowcaseProjectPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        eyebrow="Showcase"
        title="Share your project"
        description="Upload a playable Unity WebGL build so classmates can try it, like it, and leave feedback."
      />
      <ProjectUploadForm />
    </>
  );
}
