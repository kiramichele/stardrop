import { MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { displayName } from "@/lib/assignments";

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  submitted_at: string | null;
  users:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
};

export function DiscussionFeed({ posts }: { posts: Post[] }) {
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
        const user = Array.isArray(p.users) ? p.users[0] : p.users;
        const name = displayName(user?.first_name, user?.last_name);
        return (
          <Card key={p.id}>
            <div className="flex items-start gap-3 mb-3">
              <Avatar
                firstName={user?.first_name}
                lastName={user?.last_name}
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