"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  setGistPublic,
  setSubmissionVisibility,
} from "@/app/starhub/actions";

type Target =
  | { kind: "gist"; id: string }
  | { kind: "submission"; id: string };

/**
 * Owner / teacher visibility flip. For owners it's a one-click toggle.
 * For visitors we don't render this component at all.
 *
 * The video-consent guard (teachers can't publish a video on a student's
 * behalf) lives in setSubmissionPublicRecord — surfaced as the toast.
 */
export function EntryVisibilityChip({
  target,
  initialIsPublic,
  canManage,
}: {
  target: Target;
  initialIsPublic: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    // Visitor view: just a static badge.
    return (
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label",
          "bg-sage-100 text-sage-800 border-sage-200",
        ].join(" ")}
      >
        <Eye className="h-2.5 w-2.5" />
        Public
      </span>
    );
  }

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    setError(null);
    start(async () => {
      const result =
        target.kind === "gist"
          ? await setGistPublic(target.id, next)
          : await setSubmissionVisibility(target.id, next);
      if (!result.ok) {
        setIsPublic(!next);
        setError(result.error ?? "Couldn't update.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
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
            ? "Public on the StarHub — click to make private"
            : "Private — click to share on the StarHub"
        }
      >
        {isPublic ? (
          <>
            <Eye className="h-3.5 w-3.5" />
            Public
          </>
        ) : (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            Private
          </>
        )}
      </button>
      {error && <span className="text-xs text-terracotta-800">{error}</span>}
    </span>
  );
}
