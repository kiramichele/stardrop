"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { useDictationEnabled } from "./DictationContext";

// Whether this browser can record audio. Read via useSyncExternalStore so the
// server renders `false` and the client reads the real value on mount — no
// hydration mismatch and no setState-in-effect.
function browserSupportsRecording(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window
  );
}
const noopSubscribe = () => () => {};

interface DictationButtonProps {
  /** Called with the transcribed text when a recording finishes. */
  onTranscript: (text: string) => void;
  className?: string;
  title?: string;
}

type Status = "idle" | "recording" | "transcribing" | "error";

/** Append dictated text to an existing field value, tidying whitespace. */
export function appendDictation(prev: string, text: string): string {
  const addition = text.trim();
  if (!addition) return prev;
  if (!prev.trim()) return addition;
  return `${prev.replace(/\s*$/, "")} ${addition}`;
}

/**
 * A reusable dictation mic. Records with the browser MediaRecorder API, posts
 * the audio to /api/stt (ElevenLabs Scribe), and hands the transcript back via
 * onTranscript. Renders nothing when speech-to-text isn't configured on the
 * server or the browser can't record — so callers can drop it in freely.
 */
export function DictationButton({
  onTranscript,
  className = "",
  title = "Dictate with your voice",
}: DictationButtonProps) {
  const enabled = useDictationEnabled();
  const supported = useSyncExternalStore(
    noopSubscribe,
    browserSupportsRecording,
    () => false
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Clean up an in-flight recording if the component unmounts.
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!enabled || !supported) return null;

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function transcribe(blob: Blob) {
    setStatus("transcribing");
    setError(null);
    try {
      const form = new FormData();
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      form.append("audio", blob, `recording.${ext}`);
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      const text = (data.text ?? "").trim();
      if (text) onTranscript(text);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Transcription failed");
    }
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size > 0) transcribe(blob);
        else setStatus("idle");
      };
      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch {
      setStatus("error");
      setError("Microphone access denied");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    // status flips to "transcribing" in onstop
  }

  function onClick() {
    if (status === "recording") stop();
    else if (status === "idle" || status === "error") start();
  }

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={transcribing}
      title={
        status === "error" && error
          ? error
          : recording
            ? "Stop recording"
            : title
      }
      aria-label={recording ? "Stop recording" : title}
      className={[
        "inline-flex items-center justify-center w-8 h-8 rounded-cozy border transition-colors flex-shrink-0",
        recording
          ? "bg-terracotta-500 text-white border-terracotta-500 animate-pulse"
          : status === "error"
            ? "bg-terracotta-50 text-terracotta-700 border-terracotta-200"
            : "bg-cream-50 text-wood-700 border-wood-200 hover:bg-cream-100 hover:border-wood-300",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {transcribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : recording ? (
        <Square className="w-3.5 h-3.5" fill="currentColor" />
      ) : status === "error" ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
