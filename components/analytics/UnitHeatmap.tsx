import type { UnitClassHeatmap } from "@/lib/analytics-server";

// Average-score heat ramp: terracotta (low) -> honey -> sage (high).
function heatClass(pct: number | null): string {
  if (pct === null) return "bg-cream-100 text-wood-400";
  if (pct >= 90) return "bg-sage-300 text-sage-900";
  if (pct >= 80) return "bg-sage-200 text-sage-900";
  if (pct >= 70) return "bg-honey-200 text-honey-900";
  if (pct >= 60) return "bg-honey-300 text-honey-900";
  return "bg-terracotta-200 text-terracotta-900";
}

const LEGEND: { label: string; cls: string }[] = [
  { label: "<60", cls: "bg-terracotta-200" },
  { label: "60s", cls: "bg-honey-300" },
  { label: "70s", cls: "bg-honey-200" },
  { label: "80s", cls: "bg-sage-200" },
  { label: "90+", cls: "bg-sage-300" },
];

export function UnitHeatmap({ data }: { data: UnitClassHeatmap }) {
  if (data.units.length === 0 || data.classes.length === 0) {
    return (
      <p className="text-sm text-wood-600">
        Nothing to chart yet — link assignments to lessons (so they have a
        unit) and the heat map fills in.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-40" />
              {data.classes.map((c) => (
                <th
                  key={c.id}
                  className="label-eyebrow text-wood-500 pb-1 px-1 text-center min-w-[4.5rem]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.units.map((u) => (
              <tr key={u.id}>
                <td className="text-sm text-wood-800 pr-3 align-middle">
                  {u.title}
                </td>
                {data.classes.map((c) => {
                  const cell = data.cells[u.id]?.[c.id];
                  if (!cell || cell.assignmentCount === 0) {
                    return (
                      <td
                        key={c.id}
                        className="rounded-cozy bg-cream-100 text-wood-300 text-center text-xs py-2"
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c.id}
                      className={`rounded-cozy text-center px-1 py-1.5 align-middle ${heatClass(
                        cell.avgPct
                      )}`}
                      title={`${u.title} · ${c.label} — ${cell.assignmentCount} assignment${
                        cell.assignmentCount === 1 ? "" : "s"
                      }`}
                    >
                      <div className="font-display text-base leading-none">
                        {cell.avgPct === null
                          ? "—"
                          : `${Math.round(cell.avgPct)}%`}
                      </div>
                      <div className="text-[0.6rem] leading-tight mt-0.5 opacity-80">
                        {cell.completionPct === null
                          ? "no work"
                          : `${Math.round(cell.completionPct)}% done`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-xs text-wood-500">
          Cell = average score; small text = completion.
        </span>
        <span className="flex items-center gap-1">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${l.cls}`} />
              <span className="text-[0.65rem] text-wood-500">{l.label}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
