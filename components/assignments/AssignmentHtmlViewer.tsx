"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ReadAloudBar, type ReadAloudHandle } from "@/components/ui/ReadAloudBar";

interface AssignmentHtmlViewerProps {
  assignmentId: string;
  htmlUrl: string;
  /** Whether ElevenLabs read-aloud is configured on the server. */
  ttsEnabled: boolean;
  height?: string;
  title?: string;
}

// Same reader protocol LessonViewer speaks — see lib/lesson-reader.ts. This
// is the lighter sibling: assignment HTML prompts don't have a highlights
// table, so add/remove just aren't persisted (the reader script still
// applies them optimistically in the iframe, so highlighting still works
// for the current viewing session — it just won't survive a reload).
const HOST_SOURCE = "sd-host";

function makeNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

/**
 * Renders an assignment's uploaded HTML (the interactive_html_url column —
 * shared by Interactive HTML's own activity component's directions,
 * Dev log / Video response / Code prompts) through the same reader-enabled
 * proxy lessons use, so students get selection highlighting, read-aloud-
 * a-selection, AND a "Read aloud" bar for the whole prompt (streamed from
 * /api/tts/assignment/:id) — the same trio lessons already had.
 */
export function AssignmentHtmlViewer({
  assignmentId,
  htmlUrl,
  ttsEnabled,
  height = "320px",
  title = "Prompt",
}: AssignmentHtmlViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioBarRef = useRef<ReadAloudHandle>(null);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const [nonce] = useState(makeNonce);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === frameBoxRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const sendInit = () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          source: HOST_SOURCE,
          type: "reader:init",
          nonce,
          ttsEnabled,
          highlights: [],
        },
        "*"
      );
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (!data || data.source !== "sd-reader") return;

      if (data.type === "reader:ready") {
        sendInit();
        return;
      }
      if (data.nonce !== nonce) return;
      if (data.type === "tts:speak" && ttsEnabled && typeof data.text === "string") {
        // Route selection reads through the same bar/audio element as the
        // whole-prompt "Read aloud" button, so play/pause state stays
        // consistent instead of two audio elements fighting each other.
        audioBarRef.current?.playText(data.text);
      }
      // highlight:add / highlight:remove: no assignment-level highlights
      // table, so intentionally not persisted — see the note above.
    };

    window.addEventListener("message", onMessage);
    sendInit();
    return () => window.removeEventListener("message", onMessage);
  }, [nonce, ttsEnabled]);

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

  const src = `${htmlUrl}${htmlUrl.includes("?") ? "&" : "?"}reader=1`;

  return (
    <div className="space-y-2">
      {ttsEnabled && (
        <ReadAloudBar
          ref={audioBarRef}
          wholeContentUrl={`/api/tts/assignment/${assignmentId}`}
        />
      )}
      <Card
        padded={false}
        className="overflow-hidden"
      >
        <div ref={frameBoxRef} className="relative bg-white">
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
            src={src}
            onLoad={() =>
              iframeRef.current?.contentWindow?.postMessage(
                {
                  source: HOST_SOURCE,
                  type: "reader:init",
                  nonce,
                  ttsEnabled,
                  highlights: [],
                },
                "*"
              )
            }
            // Same sandbox as the lesson viewer — allow-scripts so the
            // prompt can be interactive, no allow-same-origin so it can
            // never reach Stardrop's session even though it's same-origin
            // through the proxy.
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="w-full block border-0"
            style={{ height: isFullscreen ? "100vh" : height }}
            title={title}
          />
        </div>
      </Card>
      <p className="text-xs text-wood-500">
        Select any text above to highlight it
        {ttsEnabled ? " or have it read aloud" : ""}.
      </p>
    </div>
  );
}
