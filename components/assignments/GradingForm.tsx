"use client";

import { useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { saveGrade } from "@/app/teacher/assignments/actions";
import type { AutoGrade } from "@/lib/assignments";
import {
  rubricEarnedPoints,
  rubricMaxPoints,
  type Rubric,
  type RubricScores,
} from "@/lib/rubrics";

interface GradingFormProps {
  submissionId: string;
  maxPoints: number;
  initialScore: number | null;
  initialFeedback: string | null;
  alreadyGraded: boolean;
  autoGrade?: AutoGrade | null;
  /**
   * When provided, render per-criterion score inputs instead of a single
   * score field. The total is auto-summed from the criterion scores and
   * posted as the regular `score` field, so the server action stays the same.
   */
  rubric?: Rubric | null;
  initialRubricScores?: RubricScores;
}

export function GradingForm({
  submissionId,
  maxPoints,
  initialScore,
  initialFeedback,
  alreadyGraded,
  autoGrade,
  rubric,
  initialRubricScores,
}: GradingFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Rubric mode state: per-criterion earned points keyed by criterion id.
  // If a criterion has no score yet (new grade), leave it undefined so the
  // input renders empty instead of "0".
  const [scores, setScores] = useState<Record<string, number | "">>(() => {
    if (!rubric) return {};
    const init: Record<string, number | ""> = {};
    for (const c of rubric.criteria) {
      const prev = initialRubricScores?.[c.id];
      init[c.id] = typeof prev === "number" ? prev : "";
    }
    return init;
  });

  const rubricTotalMax = rubric ? rubricMaxPoints(rubric.criteria) : 0;
  const rubricEarned = useMemo(() => {
    if (!rubric) return 0;
    const clean: RubricScores = {};
    for (const [k, v] of Object.entries(scores)) {
      if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
    }
    return rubricEarnedPoints(rubric.criteria, clean);
  }, [rubric, scores]);

  // Pre-fill priority for the simple (non-rubric) score field:
  // existing grade -> auto-graded amount -> empty
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

  function patchScore(criterionId: string, raw: string) {
    setScores((s) => ({
      ...s,
      [criterionId]: raw === "" ? "" : Number(raw),
    }));
  }

  // For rubric mode, the auto-summed total becomes the score the server
  // stores. Serialize the per-criterion map as JSON for the action.
  const rubricScoresJson = useMemo(() => {
    if (!rubric) return null;
    const clean: RubricScores = {};
    for (const [k, v] of Object.entries(scores)) {
      if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
    }
    return JSON.stringify(clean);
  }, [rubric, scores]);

  return (
    <form action={handleSubmit} className="space-y-4">
      {autoGrade && !alreadyGraded && !rubric && (
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

      {rubric ? (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="label-eyebrow">{rubric.name}</p>
            <p className="text-sm text-wood-500">
              Total:{" "}
              <span className="font-display text-base text-wood-800">
                {rubricEarned}
              </span>{" "}
              / {rubricTotalMax}
            </p>
          </div>

          {/* Hidden: the auto-summed total + the per-criterion map go to saveGrade */}
          <input type="hidden" name="score" value={rubricEarned} />
          <input
            type="hidden"
            name="rubric_scores_json"
            value={rubricScoresJson ?? ""}
          />

          <ul className="space-y-2">
            {rubric.criteria.map((c, idx) => (
              <li
                key={c.id}
                className="p-3 rounded-cozy border border-wood-200 bg-cream-50"
              >
                <div className="flex items-start gap-3">
                  <span className="font-display text-xs text-wood-400 w-5 pt-1 text-center flex-shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wood-900">
                      {c.label}
                    </p>
                    {c.description && (
                      <p className="text-xs text-wood-600 mt-0.5">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={c.points}
                        step={0.5}
                        value={scores[c.id] === "" ? "" : scores[c.id]}
                        onChange={(e) => patchScore(c.id, e.target.value)}
                        className="text-right"
                      />
                      <span className="text-xs text-wood-500 whitespace-nowrap">
                        / {c.points}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
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
      )}

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
