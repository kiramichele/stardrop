"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteLesson } from "@/app/teacher/lessons/actions";

interface LessonRowActionsProps {
  lessonId: string;
  lessonTitle: string;
  editHref: string;
}

export function LessonRowActions({
  lessonId,
  lessonTitle,
  editHref,
}: LessonRowActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${lessonTitle}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteLesson(lessonId);
    });
  }

  return (
    <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
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