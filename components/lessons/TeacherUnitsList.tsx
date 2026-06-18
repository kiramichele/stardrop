"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ConfirmTypedDelete } from "@/components/ui/ConfirmTypedDelete";
import { bulkDeleteUnits } from "@/app/teacher/lessons/actions";

export type UnitsListItem = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  lessonCount: number;
  publishedLessonCount: number;
};

/**
 * Selectable list of curriculum units with a floating bulk-delete bar.
 * Mirrors the TeacherAssignmentBoard pattern.
 */
export function TeacherUnitsList({ units }: { units: UnitsListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmDelete() {
    setDeleteError(null);
    const ids = [...selected];
    start(async () => {
      const result = await bulkDeleteUnits(ids);
      if (result.ok) {
        setSelected(new Set());
        setDeleteOpen(false);
        router.refresh();
      } else {
        setDeleteError(result.error);
      }
    });
  }

  const totalLessonsAffected = units
    .filter((u) => selected.has(u.id))
    .reduce((acc, u) => acc + u.lessonCount, 0);

  return (
    <>
      <div className="space-y-3 pb-24">
        {units.map((unit, idx) => {
          const isSel = selected.has(unit.id);
          return (
            <div
              key={unit.id}
              className={[
                "flex items-center gap-1 rounded-cozy-lg transition-colors",
                isSel ? "bg-terracotta-50" : "",
              ].join(" ")}
            >
              <label className="flex items-center self-stretch pl-3 pr-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(unit.id)}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                  aria-label={`Select ${unit.title}`}
                />
              </label>

              <Link
                href={`/teacher/lessons/units/${unit.id}`}
                className="flex-1 min-w-0"
              >
                <Card hoverable className="group">
                  <div className="flex items-center gap-5">
                    <div className="font-display text-2xl text-wood-400 w-8 flex-shrink-0 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-display text-xl text-wood-900 truncate">
                          {unit.title}
                        </h2>
                        {unit.published ? (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
                            <Eye className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </div>
                      {unit.description && (
                        <p className="text-sm text-wood-600 line-clamp-1">
                          {unit.description}
                        </p>
                      )}
                      <p className="text-xs text-wood-500 mt-1">
                        {unit.lessonCount}{" "}
                        {unit.lessonCount === 1 ? "lesson" : "lessons"}
                        {unit.lessonCount > 0 &&
                          ` · ${unit.publishedLessonCount} published`}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-1 flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="flex items-center gap-2 bg-wood-900 text-cream-50 rounded-full shadow-cozy-lg pl-5 pr-2 py-2">
            <span className="text-sm font-medium whitespace-nowrap">
              {selected.size} unit{selected.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-700 hover:bg-terracotta-800 disabled:opacity-50 disabled:hover:bg-terracotta-700 px-3.5 py-1.5 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                Delete
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={pending}
                aria-label="Clear selection"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-cream-300 hover:text-cream-50 hover:bg-wood-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmTypedDelete
        open={deleteOpen}
        onClose={() => {
          if (!pending) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
        title={
          selected.size === 1 ? "Delete this unit?" : `Delete ${selected.size} units?`
        }
        description={
          <>
            This permanently removes{" "}
            {selected.size === 1 ? "the unit" : `${selected.size} units`}
            {totalLessonsAffected > 0 && (
              <>
                {" "}and the{" "}
                <strong>
                  {totalLessonsAffected}{" "}
                  {totalLessonsAffected === 1 ? "lesson" : "lessons"}
                </strong>{" "}
                inside
              </>
            )}
            . Any assignments tied to those lessons keep their work but
            lose their lesson link. <strong>This can&apos;t be undone.</strong>
          </>
        }
        itemCount={selected.size}
        itemNoun="unit"
        pending={pending}
        error={deleteError}
      />
    </>
  );
}
