"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type Shortcut = { keys: string[]; label: string };

/** A single keycap. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.6rem] items-center justify-center rounded border border-wood-300 bg-cream-100 px-1.5 py-0.5 text-[0.7rem] font-semibold text-wood-700">
      {children}
    </kbd>
  );
}

/**
 * A "Shortcuts" button that opens a modal listing the given shortcuts.
 * `?` toggles the modal, `Esc` closes it. Purely the help UI — the actual
 * key handlers live with the features they drive.
 */
export function KeyboardShortcuts({
  shortcuts,
  label = "Shortcuts",
}: {
  shortcuts: Shortcut[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "?") {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Keyboard className="h-4 w-4" strokeWidth={1.75} />
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-wood-900/40 p-4 animate-fade-in"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-cozy-lg border border-wood-100 bg-cream-50 p-6 shadow-cozy-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-wood-900">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-wood-500 transition-colors hover:text-terracotta-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="space-y-2.5">
              {shortcuts.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-wood-700">{s.label}</span>
                  <span className="flex flex-shrink-0 items-center gap-1">
                    {s.keys.map((k, i) => (
                      <span key={k} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-wood-400">+</span>
                        )}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs text-wood-400">
              Press <Kbd>?</Kbd> any time to open this list.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
