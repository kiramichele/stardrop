"use client";

import { useState, useTransition } from "react";
import { Sparkles, Lock, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toggleUnitySimulation } from "@/app/teacher/settings/actions";

export function UnitySimulationToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function flip() {
    const next = !enabled;
    setError(null);
    setEnabled(next); // optimistic
    start(async () => {
      const result = await toggleUnitySimulation(next);
      if (!result.ok) {
        setEnabled(!next); // roll back
        setError(result.error);
        return;
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    });
  }

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border",
            enabled
              ? "bg-terracotta-100 border-terracotta-200 text-terracotta-700"
              : "bg-cream-200 border-wood-200 text-wood-500",
          ].join(" ")}
        >
          {enabled ? (
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display text-lg text-wood-900">
              Simulate in Unity
            </h3>
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide-label",
                enabled
                  ? "bg-sage-100 text-sage-700 border-sage-200"
                  : "bg-cream-200 text-wood-600 border-wood-200",
              ].join(" ")}
            >
              {enabled ? "Available to students" : "Hidden from students"}
            </span>
          </div>
          <p className="text-sm text-wood-600 mt-1">
            When off, the &ldquo;Simulate in Unity&rdquo; button is replaced
            with a small note in the Playground and on any Unity-type code
            assignment. Students can still write and save code; they just
            can&apos;t run the AI simulation until you turn it back on.
          </p>

          <div className="flex items-center gap-3 mt-3">
            <Button
              variant={enabled ? "secondary" : "primary"}
              onClick={flip}
              disabled={pending}
            >
              {pending
                ? "Saving…"
                : enabled
                  ? "Turn off"
                  : "Turn on"}
            </Button>
            {justSaved && (
              <span className="flex items-center gap-1.5 text-sm text-sage-700">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {error && (
              <span className="text-sm text-terracotta-700">{error}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
