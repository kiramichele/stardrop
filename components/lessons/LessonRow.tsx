import Link from "next/link";
import { Check, Lock, FileText, Eye, EyeOff, ChevronRight } from "lucide-react";
import type { LessonWithStatus } from "@/lib/lessons";
import { LessonRowActions } from "./LessonRowActions";

interface LessonRowProps {
  lesson: LessonWithStatus;
  href: string;
  role: "teacher" | "student";
  /** Position-aware: pass `false` for the first lesson in the list. */
  canMoveUp?: boolean;
  /** Position-aware: pass `false` for the last lesson in the list. */
  canMoveDown?: boolean;
}

export function LessonRow({
  lesson,
  href,
  role,
  canMoveUp = false,
  canMoveDown = false,
}: LessonRowProps) {
  const isTeacher = role === "teacher";
  const isInteractive = !lesson.locked || isTeacher;

  const statusBadge = (() => {
    if (isTeacher) {
      return lesson.published ? (
        <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
          <Eye className="w-3 h-3" /> Published
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
          <EyeOff className="w-3 h-3" /> Draft
        </span>
      );
    }
    if (lesson.completed)
      return (
        <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
          <Check className="w-3 h-3" /> Done
        </span>
      );
    if (lesson.locked)
      return (
        <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
          <Lock className="w-3 h-3" /> Locked
        </span>
      );
    return null;
  })();

  const content = (
    <>
      <div
        className={[
          "w-8 h-8 rounded-cozy flex items-center justify-center flex-shrink-0",
          lesson.completed
            ? "bg-sage-100 text-sage-700"
            : lesson.locked
              ? "bg-cream-200 text-wood-400"
              : "bg-terracotta-50 text-terracotta-600",
        ].join(" ")}
      >
        {lesson.completed ? (
          <Check className="w-4 h-4" strokeWidth={2.25} />
        ) : lesson.locked ? (
          <Lock className="w-4 h-4" strokeWidth={1.75} />
        ) : (
          <FileText className="w-4 h-4" strokeWidth={1.75} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-wood-900 truncate">{lesson.title}</p>
        {!lesson.html_url && isTeacher && (
          <p className="text-xs text-wood-500 mt-0.5">No content uploaded</p>
        )}
      </div>

      {statusBadge}
    </>
  );

  if (!isInteractive) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-cozy opacity-60 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <div className="group flex items-center rounded-cozy hover:bg-cream-200 transition-colors duration-150">
      <Link
        href={href}
        className="flex-1 flex items-center gap-3 px-3 py-2 min-w-0"
      >
        {content}
        {!isTeacher && (
          <ChevronRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0 ml-2" />
        )}
      </Link>

      {isTeacher && (
        <LessonRowActions
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          editHref={href}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      )}
    </div>
  );
}