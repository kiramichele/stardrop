"use client";

import { useState, useTransition } from "react";
import { Pin, Trash2, Flag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { deletePost, setPostPinned } from "@/app/discussions/actions";
import { formatAuthorName, type BoardPost } from "@/lib/discussions";

interface PostCardProps {
  post: BoardPost;
  currentUserId: string;
  isTeacher: boolean;
}

export function PostCard({ post, currentUserId, isTeacher }: PostCardProps) {
  const [isPending, start] = useTransition();
  const [deleted, setDeleted] = useState(post.deleted);
  const [pinned, setPinned] = useState(post.isPinned);

  const canDelete = isTeacher || post.author?.id === currentUserId;

  function onDelete() {
    if (!confirm("Remove this post?")) return;
    start(async () => {
      const r = await deletePost(post.id);
      if (r.ok) setDeleted(true);
      else alert(r.error ?? "Couldn't remove post");
    });
  }

  function onPin() {
    start(async () => {
      const r = await setPostPinned(post.id, !pinned);
      if (r.ok) setPinned(!pinned);
    });
  }

  if (deleted) {
    return (
      <div className="flex gap-3 py-3 opacity-70">
        <div className="w-9 h-9 rounded-full bg-cream-200 flex-shrink-0" />
        <p className="text-sm text-wood-500 italic pt-1.5">
          This post was removed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-3">
      <Avatar
        firstName={post.author?.firstName}
        lastName={post.author?.lastName}
        avatarUrl={post.author?.avatarUrl ?? null}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-wood-900 text-sm">
            {post.author
              ? formatAuthorName(
                  post.author.firstName,
                  post.author.lastName,
                  isTeacher
                )
              : "Unknown"}
          </span>
          {post.author?.role === "teacher" && (
            <span className="text-[0.65rem] uppercase tracking-wide-label font-semibold px-1.5 py-0.5 rounded-cozy bg-terracotta-100 text-terracotta-800">
              Teacher
            </span>
          )}
          {pinned && <Pin className="w-3.5 h-3.5 text-terracotta-600" />}
          {post.createdAt && (
            <span className="text-xs text-wood-500">
              {new Date(post.createdAt).toLocaleString()}
            </span>
          )}
          {isTeacher && post.flagged && (
            <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-wide-label font-semibold px-1.5 py-0.5 rounded-cozy bg-honey-100 text-honey-800">
              <Flag className="w-3 h-3" /> Flagged: {post.flaggedTerms.join(", ")}
            </span>
          )}
        </div>

        {post.body && (
          <p className="text-sm text-wood-800 whitespace-pre-wrap mt-1 leading-relaxed">
            {post.body}
          </p>
        )}

        {post.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.attachments.map((a) => {
              const url = `/api/files/discussion/${a.storagePath}`;
              return a.kind === "image" ? (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="max-h-64 rounded-cozy border border-wood-200"
                  />
                </a>
              ) : (
                <video
                  key={a.id}
                  src={url}
                  controls
                  className="max-h-64 rounded-cozy border border-wood-200 bg-black"
                />
              );
            })}
          </div>
        )}

        {(canDelete || isTeacher) && (
          <div className="flex items-center gap-1 mt-1.5 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {isTeacher && (
              <button
                type="button"
                onClick={onPin}
                disabled={isPending}
                className="text-xs text-wood-500 hover:text-terracotta-700 px-1.5 py-0.5 rounded-cozy hover:bg-cream-200 disabled:opacity-50"
              >
                {pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isPending}
                className="text-xs text-wood-500 hover:text-terracotta-700 px-1.5 py-0.5 rounded-cozy hover:bg-cream-200 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
