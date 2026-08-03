"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  markLessonComplete,
  addHighlight,
  removeHighlight,
} from "@/app/teacher/lessons/actions";
import type { LessonHighlight } from "@/lib/lessons";
import { ReadAloudBar, type ReadAloudHandle } from "./ReadAloudBar";

interface LessonViewerProps {
  htmlUrl: string | null;
  isCompleted: boolean;
  /**
   * If provided, the "Mark complete" button is rendered and clicking it
   * fires markLessonComplete(lessonId). Omit for teacher preview mode.
   */
  lessonId?: string;
  height?: string;
  /**
   * Student reading view: turns on the injected reader script (highlighting
   * + read-aloud). Requires lessonId. Off for teacher preview / slideshows.
   */
  enableReader?: boolean;
  /** The student's saved highlights, re-applied on load. */
  highlights?: LessonHighlight[];
  /** Whether ElevenLabs read-aloud is configured on the server. */
  ttsEnabled?: boolean;
}

// Messages we send to the iframe are tagged so the reader script can trust
// them (alongside a per-load nonce). Replies come back tagged "sd-reader".
const HOST_SOURCE = "sd-host";

// Module-scope so the impure call isn't in the component render body.
function makeNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export function LessonViewer({
  htmlUrl,
  isCompleted,
  lessonId,
  height = "75vh",
  enableReader = false,
  highlights = [],
  ttsEnabled = false,
}: LessonViewerProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(isCompleted);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioBarRef = useRef<ReadAloudHandle>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === frameBoxRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    const el = frameBoxRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => void })
      | null;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    } else {
      el.webkitRequestFullscreen?.();
    }
  }
  // Stable per-mount nonce; lazy init keeps the impure call out of render.
  const [nonce] = useState(makeNonce);
  // Latest highlights, read inside the message handler without re-binding it.
  const highlightsRef = useRef<LessonHighlight[]>(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  const readerOn = enableReader && !!lessonId && !!htmlUrl;

  useEffect(() => {
    if (!readerOn) return;

    const sendInit = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      // Target "*" because the sandboxed iframe is an opaque origin; the
      // reader script captures our real origin from this message's event
      // and validates the nonce on every subsequent exchange.
      win.postMessage(
        {
          source: HOST_SOURCE,
          type: "reader:init",
          nonce,
          ttsEnabled,
          highlights: highlightsRef.current,
        },
        "*"
      );
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (!data || data.source !== "sd-reader") return;

      // The script announces itself once loaded; (re)send init.
      if (data.type === "reader:ready") {
        sendInit();
        return;
      }
      if (data.nonce !== nonce) return;

      if (data.type === "highlight:add") {
        const { tempId, startOffset, endOffset, quote, color } = data;
        startTransition(async () => {
          const result = await addHighlight({
            lessonId: lessonId!,
            startOffset,
            endOffset,
            quote,
            color,
          });
          const win = iframeRef.current?.contentWindow;
          if (!win) return;
          if (result.ok) {
            win.postMessage(
              {
                source: HOST_SOURCE,
                type: "highlight:added",
                nonce,
                tempId,
                id: result.id,
              },
              "*"
            );
          } else {
            win.postMessage(
              {
                source: HOST_SOURCE,
                type: "highlight:rejected",
                nonce,
                tempId,
              },
              "*"
            );
          }
        });
      } else if (data.type === "highlight:remove") {
        const id = data.id;
        if (typeof id === "string" && !id.startsWith("tmp-")) {
          startTransition(async () => {
            await removeHighlight(id);
          });
        }
      } else if (data.type === "tts:speak") {
        if (ttsEnabled && typeof data.text === "string") {
          audioBarRef.current?.playText(data.text);
        }
      }
    };

    window.addEventListener("message", onMessage);
    // Fallback in case the iframe loaded before this effect attached.
    sendInit();
    return () => window.removeEventListener("message", onMessage);
  }, [readerOn, lessonId, ttsEnabled, nonce]);

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

  const iframeSrc = readerOn
    ? `${htmlUrl}${htmlUrl.includes("?") ? "&" : "?"}reader=1`
    : htmlUrl;

  return (
    <div className="space-y-4 animate-fade-in">
      {readerOn && ttsEnabled && lessonId && (
        <ReadAloudBar ref={audioBarRef} lessonId={lessonId} />
      )}

      <div
        ref={frameBoxRef}
        className="relative bg-cream-50 rounded-cozy-lg shadow-cozy border border-wood-100 overflow-hidden"
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit full screen" : "View full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "View full screen"}
          className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-cozy bg-wood-900/55 text-white hover:bg-wood-900/75 backdrop-blur-sm transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" strokeWidth={2} />
          ) : (
            <Maximize2 className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={() => {
            if (!readerOn) return;
            // Kick off init once the document (and reader script) exist.
            iframeRef.current?.contentWindow?.postMessage(
              {
                source: HOST_SOURCE,
                type: "reader:init",
                nonce,
                ttsEnabled,
                highlights: highlightsRef.current,
              },
              "*"
            );
          }}
          // allow-scripts so interactive lessons work; intentionally no
          // allow-same-origin — the proxy URL is same-origin as Stardrop,
          // and allow-same-origin + allow-scripts together would defeat
          // the sandbox and let the lesson read Stardrop's session
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="w-full block border-0 bg-white"
          style={{ height: isFullscreen ? "100vh" : height }}
          title="Lesson content"
        />
      </div>

      {readerOn && (
        <p className="text-xs text-wood-500">
          Select any text in the lesson to highlight it
          {ttsEnabled ? " or have it read aloud" : ""}. Click a highlight to
          remove it.
        </p>
      )}

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
