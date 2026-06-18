import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGist, getStudentIdentityByUsername } from "@/lib/starhub-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { GistEditor } from "@/components/starhub/GistEditor";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditGistPage({
  params,
}: {
  params: Promise<{ gistId: string }>;
}) {
  const { gistId } = await params;
  const viewer = await requireUser();
  const gist = await getGist(gistId);
  if (!gist) notFound();

  const isTeacher = viewer.role === "teacher";
  if (gist.user_id !== viewer.id && !isTeacher) notFound();

  // The redirect after save uses the OWNER's username (so a teacher
  // editing a student's gist lands back on the student's StarHub).
  let username = viewer.username;
  if (gist.user_id !== viewer.id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("users")
      .select("username")
      .eq("id", gist.user_id)
      .maybeSingle();
    username = data?.username ?? viewer.username;
    // Sanity check (not strictly needed) — confirm the user exists.
    if (!(await getStudentIdentityByUsername(username))) notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="StarHub"
        title="Edit gist"
        description="Tweak the title, caption, language, or code."
      />
      <GistEditor
        initialTitle={gist.title}
        initialDescription={gist.description ?? ""}
        initialLanguage={gist.language}
        initialCode={gist.code}
        initialIsPublic={gist.is_public}
        context={{ mode: "edit", gistId: gist.id, username }}
      />
    </>
  );
}
