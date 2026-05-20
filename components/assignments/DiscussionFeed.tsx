import { MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { displayName, type DiscussionPost } from "@/lib/assignments";

export function DiscussionFeed({ posts }: { posts: DiscussionPost[] }) {
  if (posts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={MessagesSquare}
          title="No other posts yet"
          description="You're the first one to post! Others' responses will show up here as they submit."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((p) => {
        const name = displayName(p.authorFirstName, p.authorLastName);
        return (
          <Card key={p.id}>
            <div className="flex items-start gap-3 mb-3">
              <Avatar
                firstName={p.authorFirstName}
                lastName={p.authorLastName}
                avatarUrl={p.authorAvatarUrl}
                size="sm"
              />
              <div className="flex-1">
                <p className="font-medium text-wood-900">{name}</p>
                {p.submitted_at && (
                  <p className="text-xs text-wood-500">
                    {new Date(p.submitted_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-wood-800 whitespace-pre-wrap leading-relaxed pl-11">
              {p.content?.trim() || (
                <span className="italic text-wood-500">(empty post)</span>
              )}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
