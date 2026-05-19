"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { saveGrade } from "@/app/teacher/assignments/actions";

interface GradingFormProps {
  submissionId: string;
  maxPoints: number;
  initialScore: number | null;
  initialFeedback: string | null;
  alreadyGraded: boolean;
}

export function GradingForm({
  submissionId,
  maxPoints,
  initialScore,
  initialFeedback,
  alreadyGraded,
}: GradingFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
          defaultValue={initialScore ?? ""}
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