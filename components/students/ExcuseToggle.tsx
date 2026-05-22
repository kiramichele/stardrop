"use client";

import { useState, useTransition } from "react";
import { CircleSlash, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { setAssignmentExcused } from "@/app/teacher/students/actions";

/**
 * Per-assignment excuse button on a student's record. Excused assignments
 * are dropped from the student's average and never flagged as missing.
 */
export function ExcuseToggle({
  assignmentId,
  studentId,
  initialExcused,
}: {
  assignmentId: string;
  studentId: string;
  initialExcused: boolean;
}) {
  const router = useRouter();
  const [excused, setExcused] = useState(initialExcused);
  const [isPending, start] = useTransition();

  function toggle() {
    const next = !excused;
    start(async () => {
      const r = await setAssignmentExcused(assignmentId, studentId, next);
      if (r.ok) {
        setExcused(next);
        router.refresh();
      } else {
        alert(r.error ?? "Couldn't update — try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      title={excused ? "Excused — click to un-excuse" : "Excuse this assignment"}
      className={[
        "flex-shrink-0 inline-flex items-center gap-1 rounded-cozy px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        excused
          ? "bg-wood-200 text-wood-800 hover:bg-wood-300"
          : "text-wood-500 hover:bg-cream-200 hover:text-wood-800",
      ].join(" ")}
    >
      {excused ? (
        <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
      ) : (
        <CircleSlash className="w-3.5 h-3.5" strokeWidth={2} />
      )}
      {excused ? "Excused" : "Excuse"}
    </button>
  );
}
