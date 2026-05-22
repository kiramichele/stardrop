"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Kbd } from "@/components/ui/KeyboardShortcuts";

/**
 * Prev / next bar above a submission being graded. Also wires the j / k
 * keys to step through the assignment's submissions. j / k are ignored
 * while a form field is focused so they don't hijack typing.
 */
export function GradingNav({
  assignmentId,
  prevId,
  nextId,
  position,
}: {
  assignmentId: string;
  prevId: string | null;
  nextId: string | null;
  position: { index: number; total: number; graded: number };
}) {
  const router = useRouter();
  const base = `/teacher/assignments/${assignmentId}/grade`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "j" && nextId) {
        e.preventDefault();
        router.push(`${base}/${nextId}`);
      } else if (e.key === "k" && prevId) {
        e.preventDefault();
        router.push(`${base}/${prevId}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [base, prevId, nextId, router]);

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-cozy border border-wood-100 bg-cream-50 px-3 py-2">
      {prevId ? (
        <Link
          href={`${base}/${prevId}`}
          className="inline-flex items-center gap-1.5 text-sm text-wood-700 transition-colors hover:text-terracotta-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
          <Kbd>K</Kbd>
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-wood-300">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </span>
      )}

      <span className="text-center text-xs text-wood-500">
        Submission {position.index} of {position.total}
        <span className="text-wood-400"> · {position.graded} graded</span>
      </span>

      {nextId ? (
        <Link
          href={`${base}/${nextId}`}
          className="inline-flex items-center gap-1.5 text-sm text-wood-700 transition-colors hover:text-terracotta-700"
        >
          <Kbd>J</Kbd>
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-wood-300">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
