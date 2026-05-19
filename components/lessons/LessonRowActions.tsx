"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { deleteLesson, moveLesson } from "@/app/teacher/lessons/actions";

interface LessonRowActionsProps {
  lessonId: string;
  lessonTitle: string;
  editHref: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function LessonRowActions({
  lessonId,
  lessonTitle,
  editHref,
  canMoveUp,
  canMoveDown,
}: LessonRowActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${lessonTitle}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteLesson(lessonId);
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      await moveLesson(lessonId, direction);
    });
  }

  const arrowClass =
    "p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-wood-500 transition-colors";

  return (
    <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
      <button
        type="button"
        onClick={() => handleMove("up")}
        disabled={!canMoveUp || isPending}
        className={arrowClass}
        title="Move up"
        aria-label={`Move ${lessonTitle} up`}
      >
        <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => handleMove("down")}
        disabled={!canMoveDown || isPending}
        className={arrowClass}
        title="Move down"
        aria-label={`Move ${lessonTitle} down`}
      >
        <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <Link
        href={editHref}
        className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors"
        title="Edit lesson"
        aria-label={`Edit ${lessonTitle}`}
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 disabled:opacity-50 transition-colors"
        title="Delete lesson"
        aria-label={`Delete ${lessonTitle}`}
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
