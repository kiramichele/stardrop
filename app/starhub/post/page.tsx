import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostComposer } from "@/components/starhub/PostComposer";

export default async function NewStarhubPostPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        eyebrow="StarHub"
        title="New post"
        description="Share a note, screenshots, or a video of your work — like a shot of your Unity editor. Add text, media, or both."
      />
      <PostComposer userId={user.id} username={user.username} />
    </>
  );
}
