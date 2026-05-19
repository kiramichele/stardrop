"use client";

import { useState, useTransition } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface LessonViewerProps {
  htmlContent: string | null;
  completed: boolean;
  locked: boolean;
  /** Server action — when omitted, the mark-complete control is hidden (teacher preview mode). */
  onMarkComplete?: () => Promise<void>;
  height?: string;
}

export function LessonViewer({
  htmlContent,
  completed,
  locked,
  onMarkComplete,
  height = "75vh",
}: LessonViewerProps) {
  const [isPending, startTransition] = useTransition();
  const [isComplete, setIsComplete] = useState(completed);

  if (locked) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-cream-100 rounded-cozy-lg border border-wood-100"
        style={{ minHeight: height }}
      >
        <div className="w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-wood-500" strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-lg text-wood-800">Lesson locked</h3>
        <p className="text-sm text-wood-600 mt-1.5 max-w-sm text-center">
          Complete the previous lesson to unlock this one.
        </p>
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-cream-100 rounded-cozy-lg border border-wood-100"
        style={{ minHeight: height }}
      >
        <p className="text-sm text-wood-600">No content uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-cozy-lg shadow-cozy border border-wood-100 overflow-hidden">
        <iframe
          srcDoc={htmlContent}
          // allow-scripts so interactive lessons work; intentionally no allow-same-origin
          // so the iframe can't reach back into Stardrop's session
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="w-full block border-0 bg-white"
          style={{ height }}
          title="Lesson content"
        />
      </div>

      {onMarkComplete && (
        <div className="flex items-center justify-end gap-3">
          {isComplete ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-cozy bg-sage-50 text-sage-800 border border-sage-200">
              <Check className="w-4 h-4" strokeWidth={2.25} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          ) : (
            <Button
              onClick={() =>
                startTransition(async () => {
                  await onMarkComplete();
                  setIsComplete(true);
                })
              }
              disabled={isPending}
            >
              <Check className="w-4 h-4" strokeWidth={2.25} />
              {isPending ? "Marking…" : "Mark complete"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}