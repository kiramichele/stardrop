"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertCircle, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  generateMasteryHeatmap,
  type MasteryBand,
  type MasteryRow,
} from "@/app/teacher/analytics/actions";

type AssignmentOption = {
  id: string;
  label: string;
  dueDate: string | null;
  /** Computed server-side at request time — keeps "now" out of the client render. */
  isPastDue: boolean;
};
type ClassOption = { id: string; label: string };

const MASTERY_META: Record<
  MasteryBand,
  { label: string; cellCls: string; dotCls: string }
> = {
  exceeding: {
    label: "Exceeding",
    cellCls: "bg-sage-300 text-sage-900",
    dotCls: "bg-sage-300",
  },
  meeting: {
    label: "Meeting",
    cellCls: "bg-sage-200 text-sage-900",
    dotCls: "bg-sage-200",
  },
  approaching: {
    label: "Approaching",
    cellCls: "bg-honey-200 text-honey-900",
    dotCls: "bg-honey-200",
  },
  below: {
    label: "Below",
    cellCls: "bg-terracotta-200 text-terracotta-900",
    dotCls: "bg-terracotta-200",
  },
  insufficient_evidence: {
    label: "Unclear",
    cellCls: "bg-cream-200 text-wood-500",
    dotCls: "bg-cream-200",
  },
};

export function MasteryHeatmapPanel({
  assignmentOptions,
  classes,
  apiConfigured,
}: {
  assignmentOptions: AssignmentOption[];
  classes: ClassOption[];
  apiConfigured: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<MasteryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pastDueIds = new Set(
    assignmentOptions.filter((a) => a.isPastDue).map((a) => a.id)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectPastDue() {
    setSelected(new Set(pastDueIds));
  }

  function generate() {
    if (selected.size === 0) {
      setError("Check off at least one assignment first.");
      return;
    }
    setError(null);
    setRows(null);
    startTransition(async () => {
      const r = await generateMasteryHeatmap([...selected]);
      if (r.ok) setRows(r.rows);
      else setError(r.error);
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-terracotta-600" strokeWidth={2} />
        <h3 className="font-display text-lg text-wood-900">
          Mastery heatmap
        </h3>
      </div>
      <p className="text-xs text-wood-600 mb-3">
        Claude reads submissions and rates each class section&apos;s mastery
        on the assignments you pick.
      </p>

      {!apiConfigured ? (
        <p className="flex items-start gap-1.5 text-xs text-honey-800 bg-honey-50 border border-honey-200 rounded-cozy px-2.5 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to
          .env.local (and restart the server) to turn this on.
        </p>
      ) : assignmentOptions.length === 0 ? (
        <p className="text-sm text-wood-500 italic">
          Nothing to chart yet — create an assignment first.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="label-eyebrow text-wood-500">
              Assignments ({selected.size} picked)
            </p>
            <button
              type="button"
              onClick={selectPastDue}
              disabled={pastDueIds.size === 0}
              className="inline-flex items-center gap-1 text-xs text-terracotta-700 hover:text-terracotta-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Select all past due ({pastDueIds.size})
            </button>
          </div>

          <ul className="max-h-48 overflow-y-auto rounded-cozy border border-wood-200 bg-cream-50 divide-y divide-wood-100 mb-3">
            {assignmentOptions.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-cream-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                  />
                  <span className="flex-1 min-w-0 text-sm text-wood-800 truncate">
                    {a.label}
                  </span>
                  {a.dueDate && (
                    <span
                      className={[
                        "flex-shrink-0 text-[0.65rem]",
                        pastDueIds.has(a.id)
                          ? "text-terracotta-600"
                          : "text-wood-400",
                      ].join(" ")}
                    >
                      {new Date(a.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>

          <Button onClick={generate} disabled={isPending} size="sm">
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            {isPending ? "Rating mastery…" : "Generate heatmap"}
          </Button>

          {isPending && (
            <p className="text-xs text-wood-500 mt-2">
              Reading submissions and rating each class — one AI pass per
              assignment, so this can take a while with several picked.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-2.5 py-1.5 mt-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          {rows && rows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="w-40" />
                    {classes.map((c) => (
                      <th
                        key={c.id}
                        className="label-eyebrow text-wood-500 pb-1 px-1 text-center min-w-[6rem]"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.assignmentId}>
                      <td className="text-sm text-wood-800 pr-3 align-middle max-w-[10rem] truncate">
                        {row.assignmentTitle}
                      </td>
                      {!row.ok ? (
                        <td
                          colSpan={classes.length}
                          className="rounded-cozy bg-cream-100 text-wood-500 text-xs px-2 py-1.5"
                        >
                          {row.error}
                        </td>
                      ) : (
                        classes.map((c) => {
                          const cell = row.cells.find(
                            (cell) => cell.classId === c.id
                          );
                          if (!cell) {
                            return (
                              <td
                                key={c.id}
                                className="rounded-cozy bg-cream-100 text-wood-300 text-center text-xs py-2"
                              >
                                —
                              </td>
                            );
                          }
                          const meta = MASTERY_META[cell.mastery];
                          return (
                            <td
                              key={c.id}
                              title={cell.note}
                              className={`rounded-cozy text-center px-2 py-1.5 align-middle ${meta.cellCls}`}
                            >
                              <div className="text-xs font-semibold leading-tight">
                                {meta.label}
                              </div>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs text-wood-500">
                  Hover a cell for the AI&apos;s note.
                </span>
                {(Object.keys(MASTERY_META) as MasteryBand[]).map((band) => (
                  <span key={band} className="flex items-center gap-1">
                    <span
                      className={`w-3 h-3 rounded ${MASTERY_META[band].dotCls}`}
                    />
                    <span className="text-[0.65rem] text-wood-500">
                      {MASTERY_META[band].label}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {rows && rows.length === 0 && (
            <p className="text-sm text-wood-500 italic mt-3">
              No result — try again.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
