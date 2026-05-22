import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getBoardsForUser, getUserClassIds } from "@/lib/discussions-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { BoardsPanel } from "@/components/discussions/BoardsPanel";

export default async function DiscussionsPage() {
  const user = asProfile(await requireUser());
  const boards = await getBoardsForUser(user);

  const classIds = await getUserClassIds(user);
  let classes: Array<{ id: string; name: string }> = [];
  if (classIds.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds)
      .order("period_number", { ascending: true, nullsFirst: false });
    classes = data ?? [];
  }

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Discussion boards"
        description="Class discussion boards — anyone can post, the teacher moderates."
      />
      <BoardsPanel
        boards={boards}
        classes={classes}
        isTeacher={user.role === "teacher"}
      />
    </>
  );
}
