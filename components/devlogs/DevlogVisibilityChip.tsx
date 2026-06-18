"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { setDevlogPublic } from "@/app/devlogs/actions";

/**
 * Compact public/private toggle for a devlog submission. Shown on the
 * teacher grading page so the teacher can flip visibility without going
 * through the wall.
 */
export function DevlogVisibilityChip({
  submissionId,
  initialIsPublic,
}: {
  submissionId: string;
  initialIsPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    setError(null);
    start(async () => {
      const result = await setDevlogPublic(submissionId, next);
      if (!result.ok) {
        setIsPublic(!next);
        setError(result.error ?? "Couldn't update visibility.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={isPublic}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
          isPublic
            ? "bg-sage-100 text-sage-800 border-sage-200 hover:bg-sage-200"
            : "bg-cream-100 text-wood-600 border-wood-200 hover:bg-cream-200",
        ].join(" ")}
        title={
          isPublic
            ? "On the Devlogs wall — click to make private"
            : "Private — click to share on the Devlogs wall"
        }
      >
        {isPublic ? (
          <>
            <Eye className="h-3.5 w-3.5" />
            On Devlogs wall
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            Private to student
          </>
        )}
      </button>
      {error && <span className="text-xs text-terracotta-800">{error}</span>}
    </div>
  );
}
