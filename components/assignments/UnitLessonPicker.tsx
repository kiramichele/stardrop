"use client";

import { useState } from "react";
import { Label, Select, FieldHint } from "@/components/ui/Input";

type UnitOption = {
  id: string;
  title: string;
  lessons: { id: string; title: string }[];
};

/**
 * Cascading unit -> lesson picker plus a "unit quiz" toggle. Only the
 * lesson is stored on the assignment (as `lesson_id`); the unit is derived
 * from it. The unit <select> just narrows the lesson list and isn't
 * submitted. `is_unit_quiz` files the assignment under a "Unit Quiz" group.
 */
export function UnitLessonPicker({
  units,
  initialLessonId,
  initialIsUnitQuiz = false,
}: {
  units: UnitOption[];
  initialLessonId?: string | null;
  initialIsUnitQuiz?: boolean;
}) {
  const initialUnitId = initialLessonId
    ? units.find((u) => u.lessons.some((l) => l.id === initialLessonId))?.id ??
      ""
    : "";
  const [unitId, setUnitId] = useState(initialUnitId);
  const [lessonId, setLessonId] = useState(initialLessonId ?? "");

  const lessons = units.find((u) => u.id === unitId)?.lessons ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit-picker">
            Unit <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Select
            id="unit-picker"
            value={unitId}
            onChange={(e) => {
              setUnitId(e.target.value);
              setLessonId("");
            }}
          >
            <option value="">No unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="lesson_id">
            Lesson <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Select
            id="lesson_id"
            name="lesson_id"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            disabled={!unitId}
          >
            <option value="">
              {unitId ? "No specific lesson" : "Pick a unit first"}
            </option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </Select>
          <FieldHint>
            Students see this as the lesson to review for help.
          </FieldHint>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="is_unit_quiz"
          name="is_unit_quiz"
          defaultChecked={initialIsUnitQuiz}
          className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
        />
        <div>
          <Label htmlFor="is_unit_quiz" className="mb-0">
            This is the unit&apos;s quiz or test
          </Label>
          <FieldHint>
            Files it under a &quot;Unit Quiz&quot; group at the end of the unit
            instead of under the lesson. Pick any lesson in the unit above so
            it knows which unit.
          </FieldHint>
        </div>
      </div>
    </div>
  );
}
