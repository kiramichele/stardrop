"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Play, Pause, Volume2, Loader2, AlertCircle } from "lucide-react";

export interface ReadAloudHandle {
  /** Fetch + play arbitrary text (used for "read the selection"). */
  playText: (text: string) => void;
}

interface ReadAloudBarProps {
  /**
   * GET endpoint that streams mp3 for the *whole* piece of content (a
   * lesson or an assignment's HTML prompt) — e.g. `/api/tts/lesson/:id` or
   * `/api/tts/assignment/:id`. Fetched lazily, only once "play" is pressed.
   */
  wholeContentUrl: string;
}

const RATES = [0.75, 1, 1.25, 1.5] as const;
type Status = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Read-aloud controls shared by lessons and assignment HTML prompts. Owns
 * the single <audio> element used for both whole-content playback (streamed
 * from `wholeContentUrl`) and read-the-selection (posted text -> blob via
 * /api/tts/speak). The parent (LessonViewer / AssignmentHtmlViewer) holds a
 * ref and calls playText() when the iframe forwards a selection.
 */
export const ReadAloudBar = forwardRef<ReadAloudHandle, ReadAloudBarProps>(
  function ReadAloudBar({ wholeContentUrl }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const objectUrlRef = useRef<string | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [rate, setRate] = useState(1);
    const [progress, setProgress] = useState(0);
    const [source, setSource] = useState<"whole" | "selection" | null>(null);

    function setObjectUrl(url: string | null) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
    }

    useEffect(() => () => setObjectUrl(null), []);
    useEffect(() => {
      if (audioRef.current) audioRef.current.playbackRate = rate;
    }, [rate]);

    async function playWhole() {
      const audio = audioRef.current;
      if (!audio) return;
      setError(null);
      if (source !== "whole") {
        setObjectUrl(null);
        audio.src = wholeContentUrl;
        audio.playbackRate = rate;
        setSource("whole");
        setStatus("loading");
      }
      try {
        await audio.play();
      } catch {
        /* play() can reject while still loading; events drive the UI */
      }
    }

    const playText = async (text: string) => {
      const audio = audioRef.current;
      if (!audio || !text.trim()) return;
      setError(null);
      setStatus("loading");
      setSource("selection");
      try {
        const res = await fetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          throw new Error(
            (await res.text().catch(() => "")) || "Read-aloud failed"
          );
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        audio.src = url;
        audio.playbackRate = rate;
        await audio.play();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Read-aloud failed");
      }
    };

    useImperativeHandle(ref, () => ({ playText }));

    function toggle() {
      const audio = audioRef.current;
      if (!audio) return;
      if (status === "playing") {
        audio.pause();
      } else if (source) {
        audio.play().catch(() => {});
      } else {
        playWhole();
      }
    }

    function seek(fraction: number) {
      const audio = audioRef.current;
      if (audio && audio.duration && Number.isFinite(audio.duration)) {
        audio.currentTime = fraction * audio.duration;
        setProgress(fraction);
      }
    }

    const busy = status === "loading";
    const playing = status === "playing";

    return (
      <div className="flex items-center gap-3 rounded-cozy-lg border border-wood-100 bg-cream-50 px-4 py-2.5 shadow-cozy">
        <audio
          ref={audioRef}
          className="hidden"
          onPlay={() => setStatus("playing")}
          onPlaying={() => setStatus("playing")}
          onWaiting={() => setStatus("loading")}
          onPause={() =>
            setStatus((s) => (s === "loading" || s === "idle" ? s : "paused"))
          }
          onEnded={() => {
            setStatus("idle");
            setProgress(0);
            setSource(null);
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (a.duration && Number.isFinite(a.duration)) {
              setProgress(a.currentTime / a.duration);
            }
          }}
          onError={() => {
            if (source) {
              setStatus("error");
              setError("Could not load audio");
            }
          }}
        />

        <Volume2 className="w-4 h-4 text-terracotta-700 flex-shrink-0" strokeWidth={1.75} />
        <span className="text-sm font-medium text-wood-800 flex-shrink-0">
          Read aloud
        </span>

        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={playing ? "Pause" : "Play"}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-700 disabled:opacity-60 flex-shrink-0 transition-colors"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 translate-x-[1px]" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(parseFloat(e.target.value))}
          aria-label="Seek"
          className="flex-1 min-w-0 accent-terracotta-500 cursor-pointer"
        />

        <select
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          aria-label="Playback speed"
          className="flex-shrink-0 text-xs text-wood-700 bg-cream-50 border border-wood-200 rounded-cozy px-1.5 py-1 focus:outline-none focus:border-terracotta-400"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>

        {status === "error" && error && (
          <span
            className="inline-flex items-center gap-1 text-xs text-terracotta-700 flex-shrink-0 max-w-[10rem] truncate"
            title={error}
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </span>
        )}
      </div>
    );
  }
);
