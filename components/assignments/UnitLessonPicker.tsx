"use client";

import { useState } from "react";
import { Label, Select, FieldHint } from "@/components/ui/Input";

type UnitOption = {
  id: string;
  title: string;
  lessons: { id: string; title: string }[];
};

/**
 * Cascading unit -> lesson picker. Only the lesson is stored on the
 * assignment (as `lesson_id`); the unit is derived from it. The unit
 * <select> just narrows the lesson list and isn't submitted.
 */
export function UnitLessonPicker({
  units,
  initialLessonId,
}: {
  units: UnitOption[];
  initialLessonId?: string | null;
}) {
  const initialUnitId = initialLessonId
    ? units.find((u) => u.lessons.some((l) => l.id === initialLessonId))?.id ??
      ""
    : "";
  const [unitId, setUnitId] = useState(initialUnitId);
  const [lessonId, setLessonId] = useState(initialLessonId ?? "");

  const lessons = units.find((u) => u.id === unitId)?.lessons ?? [];

  return (
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
        <FieldHint>Students see this as the lesson to review for help.</FieldHint>
      </div>
    </div>
  );
}
