"use client";

import { useRef, useState } from "react";
import { Volume2, Pause, Loader2, AlertCircle } from "lucide-react";
import { useReadAloudEnabled } from "./DictationContext";

interface ReadAloudButtonProps {
  /** The text to read aloud — plain prose, e.g. assignment instructions. */
  text: string | null | undefined;
  label?: string;
  className?: string;
}

/**
 * A small, reusable "listen" button for any plain-text passage — assignment
 * instructions, a note, anything not already inside a lesson/activity
 * iframe (those use the reader-injection setup instead — see
 * AssignmentHtmlViewer / LessonViewer). Posts to the same /api/tts/speak
 * endpoint the lesson reader's "read the selection" uses. Renders nothing
 * when read-aloud isn't configured on the server, the browser can't play
 * audio, or there's no text to read.
 */
export function ReadAloudButton({
  text,
  label = "Listen",
  className = "",
}: ReadAloudButtonProps) {
  const enabled = useReadAloudEnabled();
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const trimmed = (text ?? "").trim();
  if (!enabled || !trimmed) return null;

  async function play() {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing") {
      audio.pause();
      return;
    }
    if (objectUrlRef.current) {
      audio.play().catch(() => {});
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        throw new Error(
          (await res.text().catch(() => "")) || "Read-aloud failed"
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      audio.src = url;
      await audio.play();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Read-aloud failed");
    }
  }

  return (
    <span className={["inline-flex items-center gap-1.5", className].join(" ")}>
      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "loading" ? s : "idle"))}
        onEnded={() => setStatus("idle")}
      />
      <button
        type="button"
        onClick={play}
        disabled={status === "loading"}
        title={status === "playing" ? "Pause" : label}
        className="inline-flex items-center gap-1 text-xs font-medium text-terracotta-700 hover:text-terracotta-800 disabled:opacity-60 transition-colors"
      >
        {status === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : status === "playing" ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
        {status === "playing" ? "Pause" : label}
      </button>
      {status === "error" && error && (
        <span
          className="inline-flex items-center gap-1 text-xs text-terracotta-700"
          title={error}
        >
          <AlertCircle className="w-3 h-3" />
          Couldn&apos;t read that aloud
        </span>
      )}
    </span>
  );
}
