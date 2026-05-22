"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Send, Check, AlertCircle, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import {
  ensureSubmission,
  saveDraft,
  submitAssignment,
} from "@/app/student/assignments/actions";
import { countWords } from "@/lib/assignments";

interface TextAssignmentEditorProps {
  assignmentId: string;
  initialContent: string;
  initialStatus: "draft" | "submitted" | "graded";
  initialSubmissionId: string | null;
  minimumWordCount: number | null;
  /**
   * Visibility warning shown above the submit button. Used to tell
   * discussion-post writers that classmates will see their post.
   */
  visibilityWarning?: string;
  placeholder?: string;
  /** Min height for the textarea. */
  minHeight?: string;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

export function TextAssignmentEditor({
  assignmentId,
  initialContent,
  initialStatus,
  initialSubmissionId,
  minimumWordCount,
  visibilityWarning,
  placeholder = "Write your response here…",
  minHeight = "20rem",
}: TextAssignmentEditorProps) {
  const [text, setText] = useState(initialContent);
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<string | null>(
    initialSubmissionId
  );
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const isLocked = status === "graded";

  const ensuredRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = countWords(text);
  const charCount = text.length;
  const meetsMinimum =
    !minimumWordCount || wordCount >= minimumWordCount;

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

  // Autosave on change
  useEffect(() => {
    if (isLocked) return;
    if (text === initialContent && status === initialStatus) return;

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
        const result = await saveDraft(subId, { content: text });
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
  }, [text]);

  function handleSubmit() {
    if (isLocked) return;
    if (!meetsMinimum) return;

    startSubmit(async () => {
      setSaveError(null);
      try {
        const subId = await ensureSub();
        if (!subId) {
          setSaveError("Couldn't create submission");
          return;
        }
        const result = await submitAssignment(subId, { content: text });
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

  const wordCountColor =
    !minimumWordCount
      ? "text-wood-500"
      : meetsMinimum
        ? "text-sage-700"
        : "text-honey-700";

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

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLocked}
        placeholder={placeholder}
        className="w-full font-sans text-base leading-relaxed"
        style={{ minHeight }}
      />

      {/* Word / character counter */}
      <div className="flex items-center justify-between text-sm">
        <p className={wordCountColor}>
          <span className="font-display text-base">{wordCount}</span>{" "}
          {wordCount === 1 ? "word" : "words"}
          {minimumWordCount && (
            <span className="text-wood-500">
              {" "}
              · minimum {minimumWordCount}
            </span>
          )}
          <span className="text-wood-400 mx-1.5">·</span>
          <span className="text-wood-500">{charCount} characters</span>
        </p>
      </div>

      {visibilityWarning && !isLocked && (
        <Card className="bg-cream-100 border-wood-200">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-4 h-4 text-wood-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
            <p className="text-sm text-wood-700">{visibilityWarning}</p>
          </div>
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
          {saveState === "idle" && !meetsMinimum && minimumWordCount && (
            <span className="text-honey-700">
              {minimumWordCount - wordCount} more{" "}
              {minimumWordCount - wordCount === 1 ? "word" : "words"} until you
              can submit
            </span>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLocked || isSubmitting || !meetsMinimum}
          size="lg"
          title={
            !meetsMinimum && minimumWordCount
              ? `Write at least ${minimumWordCount} words to submit`
              : undefined
          }
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