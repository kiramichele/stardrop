"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  CornerDownRight,
  Trash2,
  Send,
  EyeOff,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { submissionMediaUrl } from "@/lib/assignments";
import {
  devlogAuthorName,
  formatDevlogDate,
  type DevlogFeedItem,
  type SubmissionCommentView,
} from "@/lib/devlog-wall";
import {
  toggleDevlogLike,
  addDevlogComment,
  deleteDevlogComment,
  setDevlogPublic,
} from "@/app/devlogs/actions";

export function DevlogFeedCard({
  item,
  comments,
  currentUserId,
  isTeacher,
}: {
  item: DevlogFeedItem;
  comments: SubmissionCommentView[];
  currentUserId: string;
  isTeacher: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const isOwner = item.author.id === currentUserId;
  const canManage = isOwner || isTeacher;

  return (
    <article className="rounded-cozy-lg border border-wood-100/70 bg-cream-50 shadow-cozy overflow-hidden animate-fade-in-up">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar
          firstName={item.author.firstName}
          lastName={item.author.lastName}
          avatarUrl={item.author.avatarUrl}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-wood-900">
            {devlogAuthorName(item.author)}
          </p>
          <p className="text-xs text-wood-500 truncate">
            {item.assignmentTitle}
            {item.submittedAt && (
              <>
                <span className="text-wood-400"> · </span>
                {formatDevlogDate(item.submittedAt)}
              </>
            )}
          </p>
        </div>
        {canManage && (
          <VisibilityToggle submissionId={item.submissionId} />
        )}
      </header>

      {/* Video */}
      <video
        src={submissionMediaUrl(item.video)}
        controls
        preload="metadata"
        className="w-full max-h-[600px] bg-black"
      />

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-wood-100">
        <LikeButton
          submissionId={item.submissionId}
          initialLiked={item.likedByMe}
          initialCount={item.likeCount}
        />
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-cozy text-sm text-wood-600 hover:bg-cream-100 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {item.commentCount}
          <span className="text-wood-400 ml-1">comments</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 pt-2 border-t border-wood-100 bg-cream-50/50">
          <CommentComposer
            submissionId={item.submissionId}
            parentId={null}
            placeholder="Add a comment…"
          />
          <div className="mt-4 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-wood-500">
                No comments yet — be the first to say something nice. 💬
              </p>
            ) : (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  submissionId={item.submissionId}
                  currentUserId={currentUserId}
                  isTeacher={isTeacher}
                />
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
}

// =============================================================
// Visibility toggle (owner/teacher)
// =============================================================

function VisibilityToggle({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function makePrivate() {
    if (
      !confirm(
        "Hide this devlog from the wall? You can re-share it from the assignment page."
      )
    )
      return;
    setError(null);
    start(async () => {
      const result = await setDevlogPublic(submissionId, false);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Couldn't hide.");
    });
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={makePrivate}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs text-wood-500 hover:text-terracotta-700 disabled:opacity-50"
        title="Hide from wall"
      >
        <EyeOff className="h-3.5 w-3.5" />
        Make private
      </button>
      {error && <span className="text-xs text-terracotta-800">{error}</span>}
    </span>
  );
}

// =============================================================
// Likes
// =============================================================

function LikeButton({
  submissionId,
  initialLiked,
  initialCount,
}: {
  submissionId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const result = await toggleDevlogLike(submissionId);
      if (!result.ok) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      } else if (typeof result.liked === "boolean") {
        setLiked(result.liked);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-cozy text-sm transition-colors disabled:opacity-60",
        liked
          ? "bg-terracotta-100 text-terracotta-700"
          : "text-wood-600 hover:bg-cream-100",
      ].join(" ")}
    >
      <Heart
        className="h-4 w-4"
        strokeWidth={2}
        fill={liked ? "currentColor" : "none"}
      />
      {count}
    </button>
  );
}

// =============================================================
// Comments
// =============================================================

function CommentComposer({
  submissionId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  submissionId: string;
  parentId: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      const result = await addDevlogComment(submissionId, text, parentId);
      if (result.ok) {
        setBody("");
        router.refresh();
        onDone?.();
      } else {
        setError(result.error ?? "Couldn't post.");
      }
    });
  }

  return (
    <div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={parentId ? 2 : 2}
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
          {pending ? "Posting…" : parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  submissionId,
  currentUserId,
  isTeacher,
}: {
  comment: SubmissionCommentView;
  submissionId: string;
  currentUserId: string;
  isTeacher: boolean;
}) {
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
        <div className="mt-2 ml-9">
          <CommentComposer
            submissionId={submissionId}
            parentId={comment.id}
            placeholder={`Reply to ${devlogAuthorName(comment.author)}…`}
            autoFocus
            onDone={() => setReplying(false)}
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

function CommentBody({
  comment,
  currentUserId,
  isTeacher,
  onReply,
}: {
  comment: SubmissionCommentView;
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
      await deleteDevlogComment(comment.id);
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
            {devlogAuthorName(comment.author)}
          </span>
          <span className="text-xs text-wood-400">
            {formatDevlogDate(comment.createdAt)}
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

