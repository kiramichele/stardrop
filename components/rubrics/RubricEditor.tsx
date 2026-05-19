"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { RubricCriterion } from "@/lib/rubrics";

interface RubricEditorProps {
  initialName: string;
  initialCriteria: RubricCriterion[];
  action: (formData: FormData) => Promise<void> | void;
  submitLabel: string;
}

function makeRow(): RubricCriterion {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    label: "",
    points: 10,
  };
}

export function RubricEditor({
  initialName,
  initialCriteria,
  action,
  submitLabel,
}: RubricEditorProps) {
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState<RubricCriterion[]>(
    initialCriteria.length > 0 ? initialCriteria : [makeRow()]
  );

  const total = useMemo(
    () =>
      rows.reduce(
        (sum, r) => sum + (Number.isFinite(r.points) ? r.points : 0),
        0
      ),
    [rows]
  );

  function patch(id: string, p: Partial<RubricCriterion>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function add() {
    setRows((rs) => [...rs, makeRow()]);
  }

  function remove(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <form action={action} className="space-y-6">
      {/* RubricEditor's dynamic rows can't be plain form fields — serialize the
          whole list as one hidden JSON blob and let the server action parse. */}
      <input type="hidden" name="criteria_json" value={JSON.stringify(rows)} />

      <div>
        <Label htmlFor="name">Rubric name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Unity coding rubric"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="mb-0">Criteria</Label>
          <p className="text-sm text-wood-500">
            Total:{" "}
            <span className="font-display text-base text-wood-800">
              {total}
            </span>{" "}
            pts
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className="flex items-start gap-3 p-3 rounded-cozy border border-wood-200 bg-cream-50"
            >
              <span className="font-display text-sm text-wood-400 w-6 pt-2 text-center flex-shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 space-y-2 min-w-0">
                <Input
                  type="text"
                  value={row.label}
                  onChange={(e) => patch(row.id, { label: e.target.value })}
                  placeholder="What you're scoring (e.g. Code quality)"
                  required
                />
                <Textarea
                  value={row.description ?? ""}
                  onChange={(e) =>
                    patch(row.id, { description: e.target.value })
                  }
                  placeholder="Optional: what does success look like?"
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="w-24 flex-shrink-0">
                <Input
                  type="number"
                  value={Number.isFinite(row.points) ? row.points : 0}
                  onChange={(e) =>
                    patch(row.id, { points: Number(e.target.value) })
                  }
                  min={0}
                  step={1}
                  required
                />
                <p className="text-xs text-wood-500 text-center mt-1">pts</p>
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(row.id)}
                  className="p-1.5 mt-1 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors flex-shrink-0"
                  aria-label={`Remove criterion ${idx + 1}`}
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={add}
          variant="ghost"
          size="sm"
          className="mt-3"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add criterion
        </Button>
      </div>

      <div className="flex justify-end pt-4 border-t border-wood-100">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
