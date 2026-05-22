import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import {
  getBoard,
  getThreadWithReplies,
  getUserClassIds,
} from "@/lib/discussions-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DiscussionComposer } from "@/components/discussions/DiscussionComposer";
import { PostCard } from "@/components/discussions/PostCard";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ boardId: string; threadId: string }>;
}) {
  const { boardId, threadId } = await params;
  const user = asProfile(await requireUser());

  const board = await getBoard(boardId);
  if (!board) notFound();

  const classIds = await getUserClassIds(user);
  if (!classIds.includes(board.classId)) notFound();

  const data = await getThreadWithReplies(threadId);
  if (!data) notFound();

  const isTeacher = user.role === "teacher";
  const canReply = isTeacher || !board.isLocked;

  return (
    <>
      <Link
        href={`/discussions/${boardId}`}
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {board.title}
      </Link>

      <PageHeader
        eyebrow={board.className ?? "Discussion"}
        title="Thread"
      />

      <Card className="mb-4">
        <PostCard
          post={data.thread}
          currentUserId={user.id}
          isTeacher={isTeacher}
        />
        {data.replies.length > 0 && (
          <div className="border-t border-wood-100 mt-1 pt-1 divide-y divide-wood-100">
            {data.replies.map((r) => (
              <PostCard
                key={r.id}
                post={r}
                currentUserId={user.id}
                isTeacher={isTeacher}
              />
            ))}
          </div>
        )}
      </Card>

      {canReply ? (
        <Card>
          <h3 className="font-display text-base text-wood-900 mb-2">Reply</h3>
          <DiscussionComposer
            boardId={boardId}
            parentId={threadId}
            placeholder="Write a reply…  Use @username to notify someone."
            submitLabel="Reply"
          />
        </Card>
      ) : (
        <Card className="bg-cream-100">
          <p className="text-sm text-wood-600 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            This board is locked — replies are disabled.
          </p>
        </Card>
      )}
    </>
  );
}
