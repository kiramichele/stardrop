import { Video } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  getPublicDevlogs,
  getCommentsForSubmissions,
} from "@/lib/devlog-wall-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DevlogFeedCard } from "@/components/devlogs/DevlogFeedCard";

export default async function DevlogsWallPage() {
  const user = await requireUser();
  const items = await getPublicDevlogs(user.id);
  const comments =
    items.length > 0
      ? await getCommentsForSubmissions(items.map((i) => i.submissionId))
      : new Map();

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Devlogs"
        description="What everyone's been working on — say hi, leave a comment, drop a heart."
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Video}
            title="No public devlogs yet"
            description="When a classmate shares a devlog publicly, it shows up here for everyone to watch and comment on."
          />
        </Card>
      ) : (
        <div className="max-w-2xl space-y-6">
          {items.map((item) => (
            <DevlogFeedCard
              key={item.submissionId}
              item={item}
              comments={comments.get(item.submissionId) ?? []}
              currentUserId={user.id}
              isTeacher={user.role === "teacher"}
            />
          ))}
        </div>
      )}
    </>
  );
}
