"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markLessonComplete } from "@/app/teacher/lessons/actions";

interface LessonViewerProps {
  htmlUrl: string | null;
  isCompleted: boolean;
  /**
   * If provided, the "Mark complete" button is rendered and clicking it
   * fires markLessonComplete(lessonId). Omit for teacher preview mode.
   */
  lessonId?: string;
  height?: string;
}

export function LessonViewer({
  htmlUrl,
  isCompleted,
  lessonId,
  height = "75vh",
}: LessonViewerProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(isCompleted);

  if (!htmlUrl) {
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
          src={htmlUrl}
          // allow-scripts so interactive lessons work; intentionally no
          // allow-same-origin — the proxy URL is same-origin as Stardrop,
          // and allow-same-origin + allow-scripts together would defeat
          // the sandbox and let the lesson read Stardrop's session
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="w-full block border-0 bg-white"
          style={{ height }}
          title="Lesson content"
        />
      </div>

      {lessonId && (
        <div className="flex items-center justify-end gap-3">
          {done ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-cozy bg-sage-50 text-sage-800 border border-sage-200">
              <Check className="w-4 h-4" strokeWidth={2.25} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          ) : (
            <Button
              onClick={() =>
                startTransition(async () => {
                  await markLessonComplete(lessonId);
                  setDone(true);
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
