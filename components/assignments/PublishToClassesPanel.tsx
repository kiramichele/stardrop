"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { setAssignmentPublished } from "@/app/teacher/assignments/actions";

export type ClassPublishState = {
  id: string;
  className: string;
  periodNumber: number | null;
  published: boolean;
};

/**
 * A published checkbox per class for one assignment. Toggling publishes or
 * unpublishes just that class's copy — students in that class see it (or
 * stop seeing it) immediately.
 */
export function PublishToClassesPanel({
  states,
}: {
  states: ClassPublishState[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [published, setPublished] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(states.map((s) => [s.id, s.published]))
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function toggle(id: string) {
    const next = !published[id];
    // Optimistic — revert on failure.
    setPublished((p) => ({ ...p, [id]: next }));
    setError(null);
    setBusyId(id);
    start(async () => {
      const r = await setAssignmentPublished(id, next);
      setBusyId(null);
      if (r.ok) {
        router.refresh();
      } else {
        setPublished((p) => ({ ...p, [id]: !next }));
        setError(r.error);
      }
    });
  }

  const publishedCount = Object.values(published).filter(Boolean).length;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Eye className="w-4 h-4 text-terracotta-700" strokeWidth={1.75} />
        <h3 className="font-display text-lg text-wood-900">Publish to classes</h3>
      </div>
      <p className="text-xs text-wood-500 mb-3">
        Visible to students in {publishedCount} of {states.length}{" "}
        {states.length === 1 ? "class" : "classes"}. Toggle each on its own.
      </p>

      <div className="rounded-cozy border border-wood-200 bg-white divide-y divide-wood-100">
        {states.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-cream-100"
          >
            <input
              type="checkbox"
              checked={!!published[s.id]}
              onChange={() => toggle(s.id)}
              disabled={pending && busyId === s.id}
              className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400 flex-shrink-0 disabled:opacity-50"
            />
            <span className="text-wood-800 flex-1 min-w-0 truncate">
              {s.className}
              {s.periodNumber != null && (
                <span className="text-wood-500"> · Period {s.periodNumber}</span>
              )}
            </span>
            <span
              className={[
                "text-[0.65rem] uppercase tracking-wide-label font-semibold flex-shrink-0",
                published[s.id] ? "text-sage-700" : "text-wood-400",
              ].join(" ")}
            >
              {published[s.id] ? "Published" : "Draft"}
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </Card>
  );
}
