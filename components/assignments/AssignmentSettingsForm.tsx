"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select, FieldHint } from "@/components/ui/Input";
import { UnitLessonPicker } from "@/components/assignments/UnitLessonPicker";
import { CollaborativeFields } from "@/components/assignments/CollaborativeFields";
import { updateAssignment } from "@/app/teacher/assignments/actions";
import { rubricMaxPoints, type Rubric } from "@/lib/rubrics";
import type { CollabConfig } from "@/lib/groups";

type UnitOption = {
  id: string;
  title: string;
  lessons: { id: string; title: string }[];
};

interface AssignmentSettingsFormProps {
  assignmentId: string;
  type: string;
  initialTitle: string;
  initialInstructions: string;
  units: UnitOption[];
  initialLessonId: string | null;
  initialIsUnitQuiz: boolean;
  dueLocal: string;
  due1_5xLocal: string;
  due2xLocal: string;
  initialPoints: number;
  isTextual: boolean;
  initialMinimumWordCount: number | null;
  initialRubricId: string | null;
  rubrics: Rubric[];
  initialCodeRunMode: string;
  initialIsPractice: boolean;
  initialAutoPublishToStarhub: boolean;
  isInteractive: boolean;
  hasInteractiveHtml: boolean;
  isCode: boolean;
  collabConfig: CollabConfig;
}

/**
 * The assignment "Settings" form — a client component (not a plain
 * `<form action={serverAction}>`) specifically so a save actually tells you
 * it worked, and any failure shows up on screen instead of vanishing.
 */
export function AssignmentSettingsForm({
  assignmentId,
  type,
  initialTitle,
  initialInstructions,
  units,
  initialLessonId,
  initialIsUnitQuiz,
  dueLocal,
  due1_5xLocal,
  due2xLocal,
  initialPoints,
  isTextual,
  initialMinimumWordCount,
  initialRubricId,
  rubrics,
  initialCodeRunMode,
  initialIsPractice,
  initialAutoPublishToStarhub,
  isInteractive,
  hasInteractiveHtml,
  isCode,
  collabConfig,
}: AssignmentSettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const result = await updateAssignment(assignmentId, formData);
      if (result.ok) {
        setStatus("saved");
        // The page header, publish panel, etc. read the assignment fields
        // this form just changed — refresh so they pick up the new values
        // too, not just this form's own (uncontrolled) inputs.
        router.refresh();
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2500);
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* Hidden so updateAssignment can gate the collaborative config
          to Code assignments (type isn't otherwise editable). */}
      <input type="hidden" name="type" value={type} />
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          type="text"
          defaultValue={initialTitle}
          required
        />
      </div>
      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={5}
          defaultValue={initialInstructions}
        />
      </div>

      <UnitLessonPicker
        units={units}
        initialLessonId={initialLessonId}
        initialIsUnitQuiz={initialIsUnitQuiz}
      />

      <div>
        <Label htmlFor="due_date">Due date</Label>
        <Input
          id="due_date"
          name="due_date"
          type="datetime-local"
          defaultValue={dueLocal}
        />
      </div>
      <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
        <p className="text-sm font-medium text-wood-800 mb-2">
          Extended-time due dates{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="due_date_1_5x" className="text-xs">
              1.5× time
            </Label>
            <Input
              id="due_date_1_5x"
              name="due_date_1_5x"
              type="datetime-local"
              defaultValue={due1_5xLocal}
            />
          </div>
          <div>
            <Label htmlFor="due_date_2x" className="text-xs">
              2× (double) time
            </Label>
            <Input
              id="due_date_2x"
              name="due_date_2x"
              type="datetime-local"
              defaultValue={due2xLocal}
            />
          </div>
        </div>
        <FieldHint>
          Students in an extended-time group are held to their group&apos;s
          date. Blank falls back to the regular due date.
        </FieldHint>
      </div>
      <div>
        <Label htmlFor="points">Points</Label>
        <Input
          id="points"
          name="points"
          type="number"
          min="0"
          step="0.5"
          defaultValue={initialPoints}
        />
      </div>
      {isTextual && (
        <div>
          <Label htmlFor="minimum_word_count">
            Minimum word count{" "}
            <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Input
            id="minimum_word_count"
            name="minimum_word_count"
            type="number"
            min="1"
            defaultValue={initialMinimumWordCount ?? ""}
          />
          <FieldHint>Leave blank for no minimum.</FieldHint>
        </div>
      )}
      <div>
        <Label htmlFor="rubric_id">
          Rubric <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Select
          id="rubric_id"
          name="rubric_id"
          defaultValue={initialRubricId ?? ""}
        >
          <option value="">No rubric (single score)</option>
          {rubrics.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {rubricMaxPoints(r.criteria)} pts
            </option>
          ))}
        </Select>
        <FieldHint>
          Per-criterion scoring during grading.{" "}
          <Link
            href="/teacher/rubrics"
            className="text-terracotta-700 hover:text-terracotta-800 underline"
            target="_blank"
          >
            Manage rubrics
          </Link>
        </FieldHint>
      </div>
      <div>
        <Label htmlFor="code_run_mode">
          Code run button{" "}
          <span className="text-wood-500 font-normal">
            (Code assignments only)
          </span>
        </Label>
        <Select
          id="code_run_mode"
          name="code_run_mode"
          defaultValue={initialCodeRunMode}
        >
          <option value="none">No run button (submission-only)</option>
          <option value="csharp">Run as C#</option>
          <option value="unity">Simulate in Unity</option>
        </Select>
        <FieldHint>
          Picks the kind of starter code the student sees AND what the
          single Run button does. <strong>Run as C#</strong> compiles +
          executes; <strong>Simulate in Unity</strong> has the AI describe
          what the script would do in the Editor.
        </FieldHint>
      </div>

      <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="is_practice"
            name="is_practice"
            defaultChecked={initialIsPractice}
            className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
          />
          <span>
            <Label htmlFor="is_practice" className="mb-0 cursor-pointer">
              Practice — worth 0% of the grade
            </Label>
            <p className="text-xs text-wood-500 mt-0.5">
              Still graded normally (score + feedback), but left out of
              every average: Grades, gradebook views, analytics.
            </p>
          </span>
        </label>
      </div>

      <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="auto_publish_to_starhub"
            name="auto_publish_to_starhub"
            defaultChecked={initialAutoPublishToStarhub}
            className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
          />
          <span>
            <Label
              htmlFor="auto_publish_to_starhub"
              className="mb-0 cursor-pointer"
            >
              Auto-publish to StarHub on submit
            </Label>
            <p className="text-xs text-wood-500 mt-0.5">
              Submissions land on the student&apos;s public portfolio. For
              videos this only pre-fills their share toggle — students
              always choose for themselves.
            </p>
          </span>
        </label>
      </div>
      {isInteractive && !hasInteractiveHtml && (
        <FieldHint>
          Students won&apos;t see this even when published until the HTML
          file is uploaded above.
        </FieldHint>
      )}
      {isCode && <CollaborativeFields initial={collabConfig} />}

      {status === "error" && error && (
        <p className="flex items-start gap-1.5 text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save changes"}
      </Button>
      {status === "saved" && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-sage-700">
          <Check className="w-4 h-4" strokeWidth={2.5} />
          Saved changes
        </p>
      )}
    </form>
  );
}
