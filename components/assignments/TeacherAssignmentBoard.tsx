"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, X, GraduationCap, Trash2 } from "lucide-react";
import { type AssignmentType } from "@/lib/assignments";
import { Card } from "@/components/ui/Card";
import { ConfirmTypedDelete } from "@/components/ui/ConfirmTypedDelete";
import {
  AssignmentTypeBadge,
  PublishBadge,
} from "@/components/assignments/Badges";
import {
  bulkSetAssignmentsPublished,
  bulkDeleteAssignments,
} from "@/app/teacher/assignments/actions";

export type BoardClassCopy = {
  id: string;
  className: string;
  periodNumber: number | null;
  published: boolean;
  submissionCount: number;
};

export type BoardAssignment = {
  key: string;
  title: string;
  type: string;
  dueDate: string | null;
  points: number;
  /** Every per-class copy id — used for selection + bulk actions. */
  ids: string[];
  /** Which copy the title links to. */
  primaryId: string;
  classes: BoardClassCopy[];
  submissionCount: number;
  publishedCount: number;
};

export type BoardLessonGroup = {
  key: string;
  title: string;
  isUnitQuiz: boolean;
  assignments: BoardAssignment[];
};

export type BoardGroup = {
  key: string;
  unitTitle: string;
  lessonGroups: BoardLessonGroup[];
};

export function TeacherAssignmentBoard({ groups }: { groups: BoardGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, deleteStart] = useTransition();

  function toggleSet(ids: string[]) {
    if (ids.length === 0) return;
    setError(null);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function run(published: boolean) {
    setError(null);
    const ids = [...selected];
    start(async () => {
      const r = await bulkSetAssignmentsPublished(ids, published);
      if (r.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function confirmDelete() {
    setDeleteError(null);
    const ids = [...selected];
    deleteStart(async () => {
      const r = await bulkDeleteAssignments(ids);
      if (r.ok) {
        setSelected(new Set());
        setDeleteOpen(false);
        router.refresh();
      } else {
        setDeleteError(r.error);
      }
    });
  }

  return (
    <>
      <div className="space-y-7 pb-24">
        {groups.map((g) => {
          const unitIds = g.lessonGroups.flatMap((lg) =>
            lg.assignments.flatMap((a) => a.ids)
          );
          const unitAllSelected =
            unitIds.length > 0 && unitIds.every((id) => selected.has(id));
          return (
            <section key={g.key}>
              <label className="flex items-center gap-2 mb-3 w-fit cursor-pointer">
                <input
                  type="checkbox"
                  checked={unitAllSelected}
                  onChange={() => toggleSet(unitIds)}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                />
                <h2 className="font-display text-xl text-wood-800">
                  {g.unitTitle}
                </h2>
                <span className="text-sm text-wood-400">
                  ({unitIds.length})
                </span>
              </label>

              <Card padded={false} className="overflow-hidden">
                {g.lessonGroups.map((lg, i) => {
                  const lessonIds = lg.assignments.flatMap((a) => a.ids);
                  const lessonAllSelected = lessonIds.every((id) =>
                    selected.has(id)
                  );
                  return (
                    <div
                      key={lg.key}
                      className={i > 0 ? "border-t border-wood-100" : ""}
                    >
                      {lg.title && (
                        <label
                          className={[
                            "flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-wood-100",
                            lg.isUnitQuiz ? "bg-honey-100" : "bg-cream-100",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={lessonAllSelected}
                            onChange={() => toggleSet(lessonIds)}
                            className="w-3.5 h-3.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                          />
                          {lg.isUnitQuiz && (
                            <GraduationCap
                              className="w-3.5 h-3.5 text-honey-700"
                              strokeWidth={2}
                            />
                          )}
                          <span
                            className={[
                              "text-sm font-semibold",
                              lg.isUnitQuiz
                                ? "text-honey-900"
                                : "text-wood-600",
                            ].join(" ")}
                          >
                            {lg.title}
                          </span>
                        </label>
                      )}

                      <ul className="divide-y divide-wood-100">
                        {lg.assignments.map((a) => {
                          const isSel =
                            a.ids.length > 0 &&
                            a.ids.every((id) => selected.has(id));
                          const classCount = a.classes.length;
                          return (
                            <li
                              key={a.key}
                              className={[
                                "flex items-start gap-1 p-1.5 transition-colors",
                                isSel ? "bg-terracotta-50" : "",
                              ].join(" ")}
                            >
                              <label className="flex items-center self-stretch pl-2.5 pr-1 cursor-pointer pt-3">
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  onChange={() => toggleSet(a.ids)}
                                  aria-label={`Select ${a.title}`}
                                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                                />
                              </label>
                              <div className="flex-1 min-w-0 flex items-start gap-4 px-3 py-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <Link
                                      href={`/teacher/assignments/${a.primaryId}`}
                                      className="font-medium text-wood-900 truncate hover:text-terracotta-700 transition-colors"
                                    >
                                      {a.title}
                                    </Link>
                                    <AssignmentTypeBadge
                                      type={a.type as AssignmentType}
                                    />
                                    {a.publishedCount === classCount ? (
                                      <PublishBadge published />
                                    ) : a.publishedCount === 0 ? (
                                      <PublishBadge published={false} />
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-honey-100 text-honey-800 text-[0.65rem] font-semibold px-2 py-0.5 uppercase tracking-wide-label">
                                        {a.publishedCount}/{classCount} published
                                      </span>
                                    )}
                                  </div>
                                  {(a.dueDate || a.points) && (
                                    <p className="text-xs text-wood-500 mb-1.5">
                                      {a.dueDate
                                        ? `Due ${new Date(
                                            a.dueDate
                                          ).toLocaleDateString()}`
                                        : ""}
                                      {a.dueDate && a.points ? " · " : ""}
                                      {a.points ? `${a.points} pts` : ""}
                                    </p>
                                  )}
                                  {/* One chip per class — click to grade that
                                      class's copy. */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {a.classes.map((c) => (
                                      <Link
                                        key={c.id}
                                        href={`/teacher/assignments/${c.id}`}
                                        className={[
                                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors",
                                          c.published
                                            ? "border-wood-200 bg-cream-100 text-wood-700 hover:bg-cream-200"
                                            : "border-dashed border-wood-300 bg-cream-50 text-wood-500 hover:bg-cream-100",
                                        ].join(" ")}
                                        title={
                                          c.published
                                            ? `${c.className} — published`
                                            : `${c.className} — draft`
                                        }
                                      >
                                        <span className="truncate max-w-[9rem]">
                                          {c.className}
                                        </span>
                                        <span className="font-semibold text-terracotta-700">
                                          {c.submissionCount}
                                        </span>
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 pt-0.5">
                                  <p className="font-display text-xl text-terracotta-700">
                                    {a.submissionCount}
                                  </p>
                                  <p className="text-[0.65rem] uppercase tracking-wide-label text-wood-500 font-semibold">
                                    total
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="flex items-center gap-2 bg-wood-900 text-cream-50 rounded-full shadow-cozy-lg pl-5 pr-2 py-2">
            <span className="text-sm font-medium whitespace-nowrap">
              {selected.size} selected
            </span>
            {error && (
              <span className="text-xs text-terracotta-200 truncate">
                {error}
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => run(true)}
                disabled={isPending || deletePending}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 disabled:hover:bg-terracotta-500 px-3.5 py-1.5 text-sm font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                Publish
              </button>
              <button
                onClick={() => run(false)}
                disabled={isPending || deletePending}
                className="inline-flex items-center gap-1.5 rounded-full bg-wood-700 hover:bg-wood-600 disabled:opacity-50 disabled:hover:bg-wood-700 px-3.5 py-1.5 text-sm font-medium transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" strokeWidth={2} />
                Unpublish
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                disabled={isPending || deletePending}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-700 hover:bg-terracotta-800 disabled:opacity-50 disabled:hover:bg-terracotta-700 px-3.5 py-1.5 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                Delete
              </button>
              <button
                onClick={() => setSelected(new Set())}
                disabled={isPending || deletePending}
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
          if (!deletePending) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
        title={
          selected.size === 1
            ? "Delete this assignment?"
            : `Delete ${selected.size} assignments?`
        }
        description={
          <>
            This permanently removes{" "}
            {selected.size === 1
              ? "the assignment"
              : `${selected.size} assignments`}
            , along with every submission, grade, and feedback thread
            attached. <strong>This can&apos;t be undone.</strong>
          </>
        }
        itemCount={selected.size}
        itemNoun="assignment"
        pending={deletePending}
        error={deleteError}
      />
    </>
  );
}
