"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { CLASS_COLORS } from "@/lib/class-colors";
import { setClassColor } from "@/app/teacher/classes/actions";

/**
 * Swatch picker for a class's color tag. Saves immediately on click;
 * clicking the active swatch again clears the color.
 */
export function ClassColorPicker({
  classId,
  current,
}: {
  classId: string;
  current: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(current);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(key: string) {
    const next = selected === key ? null : key;
    const previous = selected;
    setSelected(next);
    setError(null);
    start(async () => {
      const result = await setClassColor(classId, next);
      if (!result.ok) {
        setSelected(previous); // roll back
        setError(result.error ?? "Couldn't save the color.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CLASS_COLORS.map((c) => {
          const active = selected === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => pick(c.key)}
              disabled={pending}
              title={c.label}
              aria-label={c.label}
              aria-pressed={active}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full transition-transform disabled:opacity-60",
                c.dot,
                active
                  ? "ring-2 ring-wood-400 ring-offset-2 ring-offset-cream-50"
                  : "hover:scale-110",
              ].join(" ")}
            >
              {active && (
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-wood-500">
        {selected
          ? "Click the selected color again to clear it."
          : "No color set — pick one to tag this period."}
      </p>
      {error && <p className="mt-1 text-xs text-terracotta-800">{error}</p>}
    </div>
  );
}
