"use client";

import { useId, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendPoint = {
  id: string;
  title: string;
  /** ISO date string, or null if the assignment had no due date. */
  date: string | null;
  pct: number;
};

// Three bands, not the five the unit/class heatmap uses — dot color needs
// to survive a colorblindness + contrast check (see dataviz skill), and
// this app's terracotta/sage ramps are both green-family hues, so slicing
// them into more than one step each collapses under validation. Three
// well-separated hues (terracotta/honey/sage at the -500 step) pass clean.
type DotBand = "low" | "mid" | "high";
function dotBand(pct: number): DotBand {
  if (pct >= 90) return "high";
  if (pct >= 70) return "mid";
  return "low";
}

// SVG marks need `fill-*`; the plain-HTML legend swatches need `bg-*` —
// same three colors, two different Tailwind utility families.
const DOT_COLOR: Record<DotBand, { fill: string; bg: string }> = {
  low: { fill: "fill-terracotta-500", bg: "bg-terracotta-500" },
  mid: { fill: "fill-honey-500", bg: "bg-honey-500" },
  high: { fill: "fill-sage-500", bg: "bg-sage-500" },
};

const LEGEND: { band: DotBand; label: string }[] = [
  { band: "low", label: "<70" },
  { band: "mid", label: "70s–80s" },
  { band: "high", label: "90+" },
];

// Fixed percentage-unit coordinate space — lets the SVG and the HTML
// tooltip overlay share the exact same x/y math regardless of rendered size.
const PAD_LEFT = 7;
const PAD_RIGHT = 2;
const TOP = 6;
const BOTTOM = 32;

function xFor(index: number, count: number): number {
  if (count <= 1) return (PAD_LEFT + (100 - PAD_RIGHT)) / 2;
  return PAD_LEFT + (index / (count - 1)) * (100 - PAD_RIGHT - PAD_LEFT);
}
function yFor(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  return BOTTOM - (clamped / 100) * (BOTTOM - TOP);
}
/** viewBox y-unit (0–40) -> CSS percent-of-height (0–100), for the HTML
 * tooltip overlay — the SVG's own coordinates don't need this, only
 * anything positioned with a raw CSS `top` percentage. */
function yToCssPct(y: number): number {
  return (y / 40) * 100;
}

/** Simple least-squares slope of pct against index, scaled to the full span. */
function trendDirection(points: TrendPoint[]): "up" | "down" | "steady" | null {
  if (points.length < 3) return null;
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.pct);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return "steady";
  const slope = num / den;
  const totalChange = slope * (n - 1);
  if (totalChange >= 8) return "up";
  if (totalChange <= -8) return "down";
  return "steady";
}

const TREND_META = {
  up: { icon: TrendingUp, label: "Trending up", cls: "text-sage-700" },
  down: { icon: TrendingDown, label: "Trending down", cls: "text-terracotta-700" },
  steady: { icon: Minus, label: "Holding steady", cls: "text-wood-500" },
};

export function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

  if (points.length < 2) {
    return (
      <p className="text-sm text-wood-500 italic">
        Not enough graded work yet to show a trend — this fills in as more
        assignments get graded.
      </p>
    );
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i, points.length)} ${yFor(p.pct)}`)
    .join(" ");
  const areaPath =
    `M ${xFor(0, points.length)} ${BOTTOM} ` +
    points.map((p, i) => `L ${xFor(i, points.length)} ${yFor(p.pct)}`).join(" ") +
    ` L ${xFor(points.length - 1, points.length)} ${BOTTOM} Z`;

  const gridPcts = [0, 25, 50, 75, 100];
  const direction = trendDirection(points);

  return (
    <div>
      {direction && (
        <p
          className={`inline-flex items-center gap-1.5 text-xs font-medium mb-2 ${TREND_META[direction].cls}`}
        >
          {(() => {
            const Icon = TREND_META[direction].icon;
            return <Icon className="w-3.5 h-3.5" strokeWidth={2} />;
          })()}
          {TREND_META[direction].label} over their last {points.length} graded
          assignments
        </p>
      )}

      <div className="relative">
        <svg
          viewBox="0 0 100 40"
          className="w-full h-auto"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Score trend across ${points.length} graded assignments`}
        >
          {/* Gridlines + y-axis labels */}
          {gridPcts.map((g) => (
            <g key={g}>
              <line
                x1={PAD_LEFT}
                x2={100 - PAD_RIGHT}
                y1={yFor(g)}
                y2={yFor(g)}
                vectorEffect="non-scaling-stroke"
                className="stroke-wood-100"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 1.5}
                y={yFor(g)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-wood-400"
                fontSize={3.2}
              >
                {g}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.14} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} className="text-wood-400" />

          <path
            d={linePath}
            fill="none"
            vectorEffect="non-scaling-stroke"
            className="stroke-wood-500"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => {
            const x = xFor(i, points.length);
            const y = yFor(p.pct);
            return (
              <g key={p.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={1.6}
                  className={`${DOT_COLOR[dotBand(p.pct)].fill} stroke-cream-50`}
                  strokeWidth={0.8}
                />
                {/* Larger transparent hit target, mouse + keyboard. */}
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.title}, ${p.pct.toFixed(0)} percent${
                    p.date ? `, due ${new Date(p.date).toLocaleDateString()}` : ""
                  }`}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                />
              </g>
            );
          })}
        </svg>

        {hovered !== null && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-full bg-wood-900 text-cream-50 text-xs rounded-cozy px-2.5 py-1.5 shadow-cozy whitespace-nowrap z-10"
            style={{
              left: `${xFor(hovered, points.length)}%`,
              top: `${yToCssPct(yFor(points[hovered].pct)) - 8}%`,
            }}
          >
            <p className="font-semibold">
              {points[hovered].pct.toFixed(0)}%
              <span className="font-normal text-cream-200 ml-1.5">
                {points[hovered].title}
              </span>
            </p>
            {points[hovered].date && (
              <p className="text-cream-300 text-[0.65rem]">
                {new Date(points[hovered].date!).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="text-xs text-wood-500">
          Each dot is one graded assignment, in order — hover or tab through
          for details.
        </span>
        <span className="flex items-center gap-1">
          {LEGEND.map((l) => (
            <span key={l.band} className="flex items-center gap-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${DOT_COLOR[l.band].bg}`}
              />
              <span className="text-[0.65rem] text-wood-500">{l.label}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
