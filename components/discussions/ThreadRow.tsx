"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pin, Trash2, Flag, MessageSquare, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { deletePost, setPostPinned } from "@/app/discussions/actions";
import { formatAuthorName, type BoardPost } from "@/lib/discussions";

interface ThreadRowProps {
  thread: BoardPost;
  boardId: string;
  currentUserId: string;
  isTeacher: boolean;
}

export function ThreadRow({
  thread,
  boardId,
  currentUserId,
  isTeacher,
}: ThreadRowProps) {
  const [isPending, start] = useTransition();
  const [deleted, setDeleted] = useState(thread.deleted);
  const [pinned, setPinned] = useState(thread.isPinned);

  const canDelete = isTeacher || thread.author?.id === currentUserId;

  function onDelete() {
    if (!confirm("Remove this thread?")) return;
    start(async () => {
      const r = await deletePost(thread.id);
      if (r.ok) setDeleted(true);
      else alert(r.error ?? "Couldn't remove thread");
    });
  }

  function onPin() {
    start(async () => {
      const r = await setPostPinned(thread.id, !pinned);
      if (r.ok) setPinned(!pinned);
    });
  }

  if (deleted) {
    return (
      <li className="px-4 py-3 text-sm text-wood-500 italic">
        This thread was removed.
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={`/discussions/${boardId}/${thread.id}`}
        className="group flex items-start gap-3 flex-1 min-w-0"
      >
        <Avatar
          firstName={thread.author?.firstName}
          lastName={thread.author?.lastName}
          avatarUrl={thread.author?.avatarUrl ?? null}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {pinned && (
              <Pin className="w-3.5 h-3.5 text-terracotta-600 flex-shrink-0" />
            )}
            <p className="text-sm text-wood-900 truncate group-hover:text-terracotta-700">
              {thread.body || "(no text)"}
            </p>
          </div>
          <p className="text-xs text-wood-500 mt-0.5 flex items-center gap-3">
            <span>
              {thread.author
                ? formatAuthorName(
                    thread.author.firstName,
                    thread.author.lastName,
                    isTeacher
                  )
                : "Unknown"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {thread.replyCount}
            </span>
            {thread.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {thread.attachments.length}
              </span>
            )}
            {isTeacher && thread.flagged && (
              <span className="inline-flex items-center gap-1 text-honey-700">
                <Flag className="w-3 h-3" /> flagged
              </span>
            )}
          </p>
        </div>
      </Link>
      {(canDelete || isTeacher) && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {isTeacher && (
            <button
              type="button"
              onClick={onPin}
              disabled={isPending}
              title={pinned ? "Unpin" : "Pin"}
              className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
            >
              <Pin className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              title="Delete thread"
              className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
