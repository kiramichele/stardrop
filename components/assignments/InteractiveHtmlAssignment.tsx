"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Send, Check, AlertCircle, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ensureSubmission,
  saveDraft,
  submitAssignment,
} from "@/app/student/assignments/actions";
import type { Json } from "@/types/database";

interface InteractiveHtmlAssignmentProps {
  assignmentId: string;
  htmlUrl: string;
  initialData: Json | null;
  initialStatus: "draft" | "submitted" | "graded";
  initialSubmissionId: string | null;
}

const AUTOSAVE_DEBOUNCE_MS = 1200;

type StardropProgressMessage = {
  type: "stardrop:progress" | "stardrop:complete";
  data: Json | null;
  score?: { earned: number; max: number };
};

function isStardropMessage(msg: unknown): msg is StardropProgressMessage | { type: "stardrop:ready" } {
  if (!msg || typeof msg !== "object") return false;
  const t = (msg as { type?: unknown }).type;
  return (
    t === "stardrop:ready" ||
    t === "stardrop:progress" ||
    t === "stardrop:complete"
  );
}

export function InteractiveHtmlAssignment({
  assignmentId,
  htmlUrl,
  initialData,
  initialStatus,
  initialSubmissionId,
}: InteractiveHtmlAssignmentProps) {
  const [data, setData] = useState<Json | null>(initialData);
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<string | null>(
    initialSubmissionId
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activityComplete, setActivityComplete] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  const isLocked = status === "graded";

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ensuredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hold latest data in a ref so the submit handler always sees the freshest version
  const dataRef = useRef<Json | null>(initialData);

  async function ensureSub() {
    if (submissionId) return submissionId;
    if (ensuredRef.current) {
      await new Promise((r) => setTimeout(r, 50));
      return submissionId;
    }
    ensuredRef.current = true;
    try {
      const sub = await ensureSubmission(assignmentId);
      setSubmissionId(sub.id);
      return sub.id;
    } catch (err) {
      ensuredRef.current = false;
      throw err;
    }
  }

  function debounceSave(nextData: Json | null) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const subId = await ensureSub();
        if (!subId) {
          setSaveState("error");
          setSaveError("Couldn't create draft");
          return;
        }
        const result = await saveDraft(subId, { structured_data: nextData });
        if (result.ok) {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          setSaveState("error");
          setSaveError(result.error ?? "Save failed");
        }
      } catch (err) {
        setSaveState("error");
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // Message handler — listens for iframe events
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only accept messages from our own iframe
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isStardropMessage(event.data)) return;

      const msg = event.data;

      if (msg.type === "stardrop:ready") {
        // Send the initial state back to the iframe
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "stardrop:init",
            initialData: dataRef.current ?? null,
            readOnly: isLocked,
          },
          "*"
        );
        return;
      }

      if (isLocked) return;

      if (msg.type === "stardrop:progress") {
        dataRef.current = msg.data;
        setData(msg.data);
        debounceSave(msg.data);
        return;
      }

      if (msg.type === "stardrop:complete") {
        dataRef.current = msg.data;
        setData(msg.data);
        setActivityComplete(true);
        // Save immediately on complete — skip debounce
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        (async () => {
          setSaveState("saving");
          try {
            const subId = await ensureSub();
            if (!subId) return;
            await saveDraft(subId, { structured_data: msg.data });
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 1500);
          } catch {
            setSaveState("error");
          }
        })();
        return;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, assignmentId, submissionId]);

  function handleSubmit() {
    if (isLocked) return;
    startSubmit(async () => {
      setSaveError(null);
      try {
        const subId = await ensureSub();
        if (!subId) {
          setSaveError("Couldn't create submission");
          return;
        }
        const result = await submitAssignment(subId, {
          structured_data: dataRef.current ?? null,
        });
        if (result.ok) {
          setStatus("submitted");
          setSaveState("saved");
        } else {
          setSaveError(result.error ?? "Submit failed");
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Submit failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {isLocked && (
        <Card className="bg-sage-50 border-sage-200">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-sage-700" strokeWidth={1.75} />
            <div>
              <p className="font-display text-base text-sage-900">
                Graded — activity locked
              </p>
              <p className="text-sm text-sage-700">
                Your submission has been graded. Ask Ms. Shinn if you need to
                revise.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activityComplete && !isLocked && status !== "submitted" && (
        <Card className="bg-honey-50 border-honey-200">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-honey-700" strokeWidth={1.75} />
            <div>
              <p className="font-display text-base text-honey-900">
                Activity complete!
              </p>
              <p className="text-sm text-honey-700">
                Hit Submit below to turn this in.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="bg-white rounded-cozy-lg shadow-cozy border border-wood-100 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={htmlUrl}
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          className="w-full block border-0 bg-white"
          style={{ height: "70vh" }}
          title="Interactive activity"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-wood-500 min-h-[1.5rem]">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 animate-pulse" />
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1.5 text-sage-700">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {saveState === "error" && saveError && (
            <span className="flex items-center gap-1.5 text-terracotta-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </span>
          )}
          {saveState === "idle" && status === "submitted" && (
            <span className="text-wood-500">
              Submitted — changes will save and update your submission.
            </span>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLocked || isSubmitting}
          size="lg"
        >
          <Send className="w-4 h-4" strokeWidth={2} />
          {isSubmitting
            ? "Submitting…"
            : status === "submitted"
              ? "Re-submit"
              : "Submit"}
        </Button>
      </div>
    </div>
  );
}