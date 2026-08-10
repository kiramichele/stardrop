"use client";

import { useEffect, useState, useTransition } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { updateGradeGridNote } from "@/app/teacher/gradebook/actions";

interface GradeNoteModalProps {
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  initialNote: string | null;
  onClose: () => void;
  onSaved: (note: string | null) => void;
}

export function GradeNoteModal({
  studentId,
  studentName,
  assignmentId,
  assignmentTitle,
  initialNote,
  onClose,
  onSaved,
}: GradeNoteModalProps) {
  const [text, setText] = useState(initialNote ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await updateGradeGridNote(studentId, assignmentId, text);
      if (r.ok) {
        onSaved(text.trim() || null);
        onClose();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-wood-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-cozy-lg shadow-cozy-lg border border-wood-100 w-full max-w-md"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <p className="label-eyebrow text-wood-500">Note / feedback</p>
            <h2 className="font-display text-lg text-wood-900 leading-tight truncate">
              {studentName}
            </h2>
            <p className="text-xs text-wood-500 truncate">{assignmentTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-cozy text-wood-400 hover:text-wood-700 hover:bg-cream-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-honey-800 bg-honey-50 border border-honey-200 rounded-cozy px-2.5 py-1.5">
            The student can see this — it&apos;s the same feedback field as
            the regular grading screen, not a private note.
          </p>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Nice work on the animation curves — try easing the jump next time."
          />

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-2.5 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={isPending} size="sm">
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
