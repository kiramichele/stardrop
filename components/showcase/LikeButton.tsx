"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleShowcaseLike } from "@/app/showcase/actions";

/**
 * Like toggle for a project. Updates optimistically and rolls back if the
 * server action fails.
 */
export function LikeButton({
  projectId,
  initialLiked,
  initialCount,
}: {
  projectId: string;
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
      const result = await toggleShowcaseLike(projectId);
      if (!result.ok) {
        // Roll back the optimistic update.
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
        "inline-flex flex-shrink-0 items-center gap-1.5 rounded-cozy border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
        liked
          ? "border-terracotta-200 bg-terracotta-100 text-terracotta-700"
          : "border-wood-200 bg-cream-50 text-wood-600 hover:border-terracotta-300 hover:text-terracotta-700",
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
