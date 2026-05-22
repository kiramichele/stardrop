"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  CheckCheck,
  CircleSlash,
  MessageSquarePlus,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { SubmissionStatusBadge } from "@/components/assignments/Badges";
import {
  autoGradeInteractive,
  fullCreditAll,
  applyScoreToSubmissions,
  zeroNonSubmitters,
  batchAddFeedback,
} from "@/app/teacher/assignments/actions";
import type { AssignmentType } from "@/lib/assignments";

export type BulkSubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  status: "draft" | "submitted" | "graded" | null;
  score: number | null;
  hasGrade: boolean;
  isLate: boolean;
  daysLate: number;
  whenLabel: string;
};

interface BulkGradePanelProps {
  assignmentId: string;
  assignmentType: AssignmentType;
  maxPoints: number;
  rows: BulkSubmissionRow[];
}

export function BulkGradePanel({
  assignmentId,
  assignmentType,
  maxPoints,
  rows,
}: BulkGradePanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overwrite, setOverwrite] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) =>
      s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))
    );
  }

  function ok(text: string) {
    setIsError(false);
    setMessage(text);
  }
  function err(text: string) {
    setIsError(true);
    setMessage(text);
  }

  function runAutoGrade() {
    startTransition(async () => {
      const r = await autoGradeInteractive(assignmentId, overwrite);
      if (r.ok) ok(`Auto-graded ${r.graded}, skipped ${r.skipped}.`);
      else err(r.error);
    });
  }

  function runFullCredit() {
    if (!confirm(`Give full credit (${maxPoints} pts) to every submission?`))
      return;
    startTransition(async () => {
      const r = await fullCreditAll(assignmentId, overwrite);
      if (r.ok) ok(`Full credit applied to ${r.graded}, skipped ${r.skipped}.`);
      else err(r.error);
    });
  }

  function runZeroNonSubmitters() {
    if (
      !confirm(
        "Give 0 to every enrolled student who hasn't submitted? This creates a graded submission for anyone who never started."
      )
    )
      return;
    startTransition(async () => {
      const r = await zeroNonSubmitters(assignmentId);
      if (r.ok)
        ok(`Gave 0 to ${r.zeroed} non-submitter${r.zeroed === 1 ? "" : "s"}.`);
      else err(r.error);
    });
  }

  function runApplyScore() {
    const score = Number(scoreInput);
    if (scoreInput.trim() === "" || !Number.isFinite(score)) {
      err("Enter a valid score first.");
      return;
    }
    startTransition(async () => {
      const r = await applyScoreToSubmissions(
        assignmentId,
        selectedIds,
        score,
        overwrite
      );
      if (r.ok) {
        ok(`Scored ${r.graded}, skipped ${r.skipped}.`);
        setScoreInput("");
        setSelected(new Set());
      } else {
        err(r.error);
      }
    });
  }

  function runBatchFeedback() {
    if (!feedbackInput.trim()) {
      err("Enter feedback text first.");
      return;
    }
    startTransition(async () => {
      const r = await batchAddFeedback(
        assignmentId,
        selectedIds,
        feedbackInput.trim()
      );
      if (r.ok) {
        ok(
          `Feedback added to ${r.count} submission${r.count === 1 ? "" : "s"}.`
        );
        setFeedbackInput("");
        setSelected(new Set());
      } else {
        err(r.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Global bulk actions */}
      <Card className="bg-cream-100/60">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-base text-wood-800">Bulk actions</h3>
          <label className="flex items-center gap-2 text-xs text-wood-600 cursor-pointer">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
            />
            Overwrite already-graded
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {assignmentType === "interactive_html" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={runAutoGrade}
              disabled={isPending}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              Auto-grade all
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={runFullCredit}
            disabled={isPending}
          >
            <CheckCheck className="w-3.5 h-3.5" strokeWidth={2} />
            Full credit all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={runZeroNonSubmitters}
            disabled={isPending}
          >
            <CircleSlash className="w-3.5 h-3.5" strokeWidth={2} />
            Zero non-submitters
          </Button>
        </div>
        {message && (
          <p
            className={[
              "text-xs mt-3 px-2.5 py-1.5 rounded-cozy border",
              isError
                ? "bg-terracotta-50 text-terracotta-800 border-terracotta-200"
                : "bg-sage-50 text-sage-800 border-sage-200",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </Card>

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <Card className="border-terracotta-200 bg-terracotta-50/40">
          <p className="text-sm font-medium text-wood-900 mb-3">
            {selected.size} selected
          </p>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="w-32">
                <label className="label-eyebrow block mb-1">Score</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder={`/ ${maxPoints}`}
                />
              </div>
              <Button size="sm" onClick={runApplyScore} disabled={isPending}>
                Apply score
              </Button>
            </div>
            <div>
              <label className="label-eyebrow block mb-1">
                Add feedback (posts as a thread reply)
              </label>
              <Textarea
                rows={2}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Same feedback for all selected…"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={runBatchFeedback}
                  disabled={isPending}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" strokeWidth={2} />
                  Add to {selected.size}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Submissions list */}
      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-4">
            No submissions yet.
          </p>
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-wood-100 bg-cream-50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
              aria-label="Select all submissions"
            />
            <span className="text-xs text-wood-500">
              {allSelected ? "Deselect all" : "Select all"}
            </span>
          </div>
          <ul className="divide-y divide-wood-100">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400 flex-shrink-0"
                  aria-label={`Select ${row.studentName}`}
                />
                <Link
                  href={`/teacher/assignments/${assignmentId}/grade/${row.id}`}
                  className="group flex items-center gap-3 flex-1 min-w-0 -my-1 py-1 px-2 rounded-cozy hover:bg-cream-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-wood-900 truncate">
                      {row.studentName}
                    </p>
                    <p className="text-xs text-wood-500">
                      {row.whenLabel}
                      {row.isLate && ` · ${row.daysLate}d late`}
                    </p>
                  </div>
                  {row.hasGrade && (
                    <p className="font-display text-lg text-sage-700 flex-shrink-0">
                      {row.score}
                      <span className="text-wood-400 text-sm font-normal">
                        /{maxPoints}
                      </span>
                    </p>
                  )}
                  <SubmissionStatusBadge
                    status={row.status}
                    hasGrade={row.hasGrade}
                    isLate={row.isLate}
                  />
                  <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5 flex-shrink-0" />
                </Link>
                <Link
                  href={`/teacher/students/${row.studentId}`}
                  title={`View ${row.studentName}'s record`}
                  aria-label={`View ${row.studentName}'s record`}
                  className="flex-shrink-0 p-1.5 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-cream-200 transition-colors"
                >
                  <UserRound className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
