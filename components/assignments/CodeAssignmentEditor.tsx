"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Send, Check, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CodeEditor } from "@/components/editor/CodeEditor";
import {
  ensureSubmission,
  saveDraft,
  submitAssignment,
  logPasteEvent,
} from "@/app/student/assignments/actions";

interface CodeAssignmentEditorProps {
  assignmentId: string;
  initialContent: string;
  initialStatus: "draft" | "submitted" | "graded";
  initialSubmissionId: string | null;
  starterCode?: string;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function CodeAssignmentEditor({
  assignmentId,
  initialContent,
  initialStatus,
  initialSubmissionId,
  starterCode = "// Write your Unity C# code here\n",
}: CodeAssignmentEditorProps) {
  const [code, setCode] = useState(initialContent || starterCode);
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<string | null>(
    initialSubmissionId
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const isLocked = status === "graded";

  // Track whether we've kicked off ensureSubmission to avoid duplicate creates
  const ensuredRef = useRef(false);
  // Debounce timer for autosave
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure submission exists on first interaction
  async function ensureSub() {
    if (submissionId) return submissionId;
    if (ensuredRef.current) {
      // Race guard — wait briefly for the in-flight call
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

  // Debounced autosave on every change
  useEffect(() => {
    if (isLocked) return;
    if (code === initialContent && status === initialStatus) return;

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
        const result = await saveDraft(subId, code);
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

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handlePaste(content: string, length: number) {
    if (isLocked) return;
    try {
      const subId = await ensureSub();
      if (subId) await logPasteEvent(subId, content, length);
    } catch {
      // Paste logging is best-effort; don't disrupt the student
    }
  }

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
        const result = await submitAssignment(subId, code);
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
                Graded — editing locked
              </p>
              <p className="text-sm text-sage-700">
                Your submission has been graded. Ask Ms. Shinn if you need to
                revise.
              </p>
            </div>
          </div>
        </Card>
      )}

      <CodeEditor
        value={code}
        onChange={setCode}
        onPaste={(e) => handlePaste(e.content, e.length)}
        readOnly={isLocked}
        height="60vh"
      />

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