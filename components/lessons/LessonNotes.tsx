"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Check, AlertCircle, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { saveLessonNote } from "@/app/teacher/lessons/actions";

const AUTOSAVE_DEBOUNCE_MS = 1500;
const TICK_INTERVAL_MS = 30_000;

interface LessonNotesProps {
  lessonId: string;
  initialContent: string;
  initialLastSaved: string | null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "a minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "an hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function LessonNotes({
  lessonId,
  initialContent,
  initialLastSaved,
}: LessonNotesProps) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    parseDate(initialLastSaved)
  );
  // Force re-render every 30s so the "Saved N seconds ago" stays fresh
  const [, setTick] = useState(0);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(
      () => setTick((t) => t + 1),
      TICK_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, []);

  // Debounced autosave whenever content changes
  useEffect(() => {
    // Skip the no-op case where this fires on first render with no change
    if (content === initialContent) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveState("saving");
      setError(null);
      try {
        const result = await saveLessonNote(lessonId, content);
        if (result.ok) {
          setLastSavedAt(new Date());
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          setSaveState("error");
          setError(result.error ?? "Save failed");
        }
      } catch (err) {
        setSaveState("error");
        setError(err instanceof Error ? err.message : "Save failed");
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, initialContent, lessonId]);

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen
          className="w-4 h-4 text-terracotta-700"
          strokeWidth={1.75}
        />
        <h3 className="font-display text-base text-wood-900">Your notes</h3>
        <span className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold ml-auto">
          Private to you
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Jot down anything you want to remember from this lesson…"
        className="w-full text-sm leading-relaxed font-sans"
        style={{ minHeight: "60vh" }}
      />

      <div className="mt-3 flex items-center justify-between gap-2 text-xs min-h-[1.25rem]">
        <div className="text-wood-500 truncate">
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1.5">
              <Save className="w-3 h-3 animate-pulse" />
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-sage-700">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
          {saveState === "error" && error && (
            <span className="inline-flex items-center gap-1.5 text-terracotta-700">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          )}
          {saveState === "idle" && lastSavedAt && (
            <span>Saved {timeAgo(lastSavedAt)}</span>
          )}
          {saveState === "idle" && !lastSavedAt && (
            <span className="text-wood-400">Auto-saves as you type</span>
          )}
        </div>
        <div className="text-wood-500 flex-shrink-0">
          {wordCount} {wordCount === 1 ? "word" : "words"}
          <span className="text-wood-300 mx-1.5">·</span>
          {charCount} chars
        </div>
      </div>
    </Card>
  );
}