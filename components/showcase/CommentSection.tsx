"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownRight, Send, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  authorName,
  formatShowcaseDate,
  type ShowcaseCommentView,
} from "@/lib/showcase";
import {
  addShowcaseComment,
  deleteShowcaseComment,
} from "@/app/showcase/actions";

/** Count non-deleted comments across the whole tree. */
function countLive(comments: ShowcaseCommentView[]): number {
  let n = 0;
  for (const c of comments) {
    if (!c.deleted) n += 1;
    n += countLive(c.replies);
  }
  return n;
}

export function CommentSection({
  projectId,
  comments,
  currentUserId,
  isTeacher,
}: {
  projectId: string;
  comments: ShowcaseCommentView[];
  currentUserId: string;
  isTeacher: boolean;
}) {
  const router = useRouter();
  const total = countLive(comments);

  return (
    <div>
      <h2 className="font-display text-xl text-wood-900 mb-4">
        Feedback{" "}
        {total > 0 && <span className="text-wood-400">({total})</span>}
      </h2>

      <CommentComposer
        projectId={projectId}
        parentId={null}
        placeholder="Share what you liked or some friendly feedback…"
        onPosted={() => router.refresh()}
      />

      <div className="mt-6 space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-wood-500">
            No feedback yet — be the first to leave some.
          </p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              projectId={projectId}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentComposer({
  projectId,
  parentId,
  placeholder,
  autoFocus,
  onPosted,
}: {
  projectId: string;
  parentId: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const result = await addShowcaseComment(projectId, text, parentId);
      if (result.ok) {
        setBody("");
        onPosted();
      } else {
        setError(result.error ?? "Couldn't post that.");
      }
    });
  }

  return (
    <div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={parentId ? 2 : 3}
        maxLength={2000}
        disabled={pending}
        autoFocus={autoFocus}
      />
      {error && (
        <p className="mt-1 text-xs text-terracotta-800">{error}</p>
      )}
      <div className="mt-2">
        <Button
          size="sm"
          onClick={submit}
          disabled={pending || body.trim().length === 0}
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? "Posting…" : parentId ? "Reply" : "Post feedback"}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  projectId,
  currentUserId,
  isTeacher,
}: {
  comment: ShowcaseCommentView;
  projectId: string;
  currentUserId: string;
  isTeacher: boolean;
}) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);

  return (
    <div>
      <CommentBody
        comment={comment}
        currentUserId={currentUserId}
        isTeacher={isTeacher}
        onReply={!comment.deleted ? () => setReplying((v) => !v) : undefined}
      />

      {replying && (
        <div className="mt-2 ml-10">
          <CommentComposer
            projectId={projectId}
            parentId={comment.id}
            placeholder={`Reply to ${authorName(comment.author)}…`}
            autoFocus
            onPosted={() => {
              setReplying(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-3 ml-5 space-y-3 border-l-2 border-cream-200 pl-4">
          {comment.replies.map((reply) => (
            <CommentBody
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A single comment row — used for both top-level comments and replies. */
function CommentBody({
  comment,
  currentUserId,
  isTeacher,
  onReply,
}: {
  comment: ShowcaseCommentView;
  currentUserId: string;
  isTeacher: boolean;
  onReply?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const canDelete =
    !comment.deleted &&
    (comment.author.id === currentUserId || isTeacher);

  function remove() {
    start(async () => {
      await deleteShowcaseComment(comment.id);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3">
      <Avatar
        firstName={comment.author.firstName}
        lastName={comment.author.lastName}
        avatarUrl={comment.author.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-wood-800">
            {authorName(comment.author)}
          </span>
          <span className="text-xs text-wood-400">
            {formatShowcaseDate(comment.createdAt)}
          </span>
        </div>

        {comment.deleted ? (
          <p className="mt-0.5 text-sm italic text-wood-400">
            {comment.deletedReason
              ? `[${comment.deletedReason}]`
              : "[comment removed]"}
          </p>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-wood-700">
            {comment.body}
          </p>
        )}

        {(onReply || canDelete) && (
          <div className="mt-1.5 flex items-center gap-3">
            {onReply && (
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1 text-xs text-wood-500 transition-colors hover:text-terracotta-700"
              >
                <CornerDownRight className="h-3 w-3" />
                Reply
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs text-wood-500 transition-colors hover:text-terracotta-700 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
