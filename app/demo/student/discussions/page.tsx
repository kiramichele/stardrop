import { Pin, CornerDownRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { DEMO_DISCUSSION } from "@/lib/demo/fixtures";

function nameParts(full: string): { first: string; last: string } {
  const [first, ...rest] = full.split(" ");
  return { first, last: rest.join(" ") };
}

export default function DemoStudentDiscussions() {
  const board = DEMO_DISCUSSION;

  return (
    <>
      <PageHeader
        eyebrow="Discussions"
        title={board.title}
        description={board.description}
      />

      {/* Composer */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <Avatar firstName="Maya" lastName="Rivera" avatarUrl={null} />
          <div className="flex-1">
            <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3 text-wood-400 text-sm">
              Share your pick with the class…
            </div>
            <div className="flex justify-end mt-2">
              <Button size="sm" disabled>
                Post
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {board.posts.map((post, i) => {
          const { first, last } = nameParts(post.authorName);
          return (
            <Card key={post.id}>
              <div className="flex items-start gap-3">
                <Avatar firstName={first} lastName={last} avatarUrl={null} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-wood-900">
                      {post.authorName}
                    </p>
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide-label text-honey-700">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    <span className="text-xs text-wood-400">
                      · {post.postedAt}
                    </span>
                  </div>
                  <p className="text-wood-700 mt-1.5 leading-relaxed">
                    {post.body}
                  </p>

                  {post.replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-l-2 border-wood-100 pl-4">
                      {post.replies.map((reply) => {
                        const rn = nameParts(reply.authorName);
                        return (
                          <div key={reply.id} className="flex items-start gap-2.5">
                            <Avatar
                              firstName={rn.first}
                              lastName={rn.last}
                              avatarUrl={null}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-wood-900">
                                  {reply.authorName}
                                </p>
                                <span className="text-xs text-wood-400">
                                  · {reply.postedAt}
                                </span>
                              </div>
                              <p className="text-sm text-wood-700 mt-0.5 leading-relaxed">
                                {reply.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button className="inline-flex items-center gap-1.5 text-xs text-wood-500 hover:text-terracotta-700 transition-colors mt-3">
                    <CornerDownRight className="w-3.5 h-3.5" /> Reply
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
