"use client";

import { useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { saveGrade } from "@/app/teacher/assignments/actions";
import type { AutoGrade } from "@/lib/assignments";

interface GradingFormProps {
  submissionId: string;
  maxPoints: number;
  initialScore: number | null;
  initialFeedback: string | null;
  alreadyGraded: boolean;
  autoGrade?: AutoGrade | null;
}

export function GradingForm({
  submissionId,
  maxPoints,
  initialScore,
  initialFeedback,
  alreadyGraded,
  autoGrade,
}: GradingFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Pre-fill priority: existing grade -> auto-graded amount -> empty
  const startingScore =
    initialScore ?? (autoGrade ? autoGrade.autoPoints : null);

  const action = saveGrade.bind(null, submissionId);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await action(formData);
      setSaveMessage("Grade saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {autoGrade && !alreadyGraded && (
        <div className="bg-honey-50 border border-honey-200 rounded-cozy p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles
              className="w-4 h-4 text-honey-700 flex-shrink-0"
              strokeWidth={1.75}
            />
            <p className="label-eyebrow text-honey-700">Auto-graded</p>
          </div>
          <p className="text-sm text-wood-800">
            <span className="font-display text-lg text-honey-800">
              {autoGrade.autoPoints}
            </span>
            <span className="text-wood-500"> / {autoGrade.maxAutoPoints} pts</span>
            <span className="text-wood-500 mx-1.5">·</span>
            <span className="text-wood-600">
              {autoGrade.autoCorrect} of {autoGrade.autoTotal}{" "}
              {autoGrade.autoTotal === 1 ? "question" : "questions"} correct
            </span>
          </p>
          {autoGrade.hasManualQuestions && (
            <p className="text-xs text-wood-600 leading-relaxed">
              Score is pre-filled with the auto-graded total. Read the short
              answers and{" "}
              <span className="font-medium">
                add up to{" "}
                {Math.round(
                  (maxPoints - autoGrade.maxAutoPoints) * 100
                ) / 100}{" "}
                more
              </span>{" "}
              for their typed responses.
            </p>
          )}
          {!autoGrade.hasManualQuestions && (
            <p className="text-xs text-wood-600 leading-relaxed">
              All questions are auto-graded. Click Save to finalize.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="score">
          Score{" "}
          <span className="text-wood-500 font-normal">/ {maxPoints}</span>
        </Label>
        <Input
          id="score"
          name="score"
          type="number"
          step="0.5"
          min="0"
          max={maxPoints}
          required
          defaultValue={startingScore ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="feedback">Feedback</Label>
        <Textarea
          id="feedback"
          name="feedback"
          rows={5}
          defaultValue={initialFeedback ?? ""}
          placeholder="Comments for the student (optional)"
        />
      </div>

      {saveMessage && (
        <p className="text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-cozy px-3 py-2">
          {saveMessage}
        </p>
      )}

      <Button type="submit" disabled={isSaving} className="w-full">
        <Save className="w-4 h-4" strokeWidth={2} />
        {isSaving
          ? "Saving…"
          : alreadyGraded
            ? "Update grade"
            : "Save grade"}
      </Button>
    </form>
  );
}