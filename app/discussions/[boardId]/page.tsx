import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import {
  getBoard,
  getBoardThreads,
  getUserClassIds,
} from "@/lib/discussions-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DiscussionComposer } from "@/components/discussions/DiscussionComposer";
import { ThreadRow } from "@/components/discussions/ThreadRow";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const user = asProfile(await requireUser());

  const board = await getBoard(boardId);
  if (!board) notFound();

  const classIds = await getUserClassIds(user);
  if (!classIds.includes(board.classId)) notFound();

  const threads = await getBoardThreads(boardId);
  const isTeacher = user.role === "teacher";
  const canPost = isTeacher || !board.isLocked;

  return (
    <>
      <Link
        href="/discussions"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All boards
      </Link>

      <PageHeader
        eyebrow={board.className ?? "Discussion"}
        title={board.title}
        description={board.description ?? undefined}
      />

      {canPost ? (
        <Card className="mb-4">
          <h3 className="font-display text-base text-wood-900 mb-2">
            Start a thread
          </h3>
          <DiscussionComposer
            boardId={boardId}
            placeholder="What do you want to discuss?"
            submitLabel="Post thread"
          />
        </Card>
      ) : (
        <Card className="mb-4 bg-cream-100">
          <p className="text-sm text-wood-600 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            This board is locked — new threads are disabled.
          </p>
        </Card>
      )}

      {threads.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-6">
            No threads yet. Be the first to post.
          </p>
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                boardId={boardId}
                currentUserId={user.id}
                isTeacher={isTeacher}
              />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
