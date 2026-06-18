"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Send, Check, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { CodeRunner } from "@/components/playground/CodeRunner";
import { starterCodeFor, type CodeRunMode } from "@/lib/playground";
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
  /** Which run buttons the assignment exposes. Default 'both'. */
  codeRunMode?: CodeRunMode;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function CodeAssignmentEditor({
  assignmentId,
  initialContent,
  initialStatus,
  initialSubmissionId,
  starterCode,
  codeRunMode = "both",
}: CodeAssignmentEditorProps) {
  // Starter for a brand-new submission: explicit prop wins, otherwise
  // derive from the run mode (csharp → console boilerplate, anything
  // else → MonoBehaviour boilerplate).
  const resolvedStarter = starterCode ?? starterCodeFor("csharp", codeRunMode);
  const [code, setCode] = useState(initialContent || resolvedStarter);
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

  const ensuredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const result = await saveDraft(subId, { content: code });
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
      // best-effort
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
        const result = await submitAssignment(subId, { content: code });
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

      {codeRunMode !== "none" && (
        <Card>
          <h3 className="font-display text-lg text-wood-900 mb-3">Try it out</h3>
          <CodeRunner
            getCode={() => code}
            mode={codeRunMode}
            language="csharp"
          />
        </Card>
      )}

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