"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  BELL_SCHEDULE,
  blockLabel,
  formatBlockTime,
  currentBlockIndex,
  type BlockKind,
} from "@/lib/schedule";

const KIND_STYLE: Record<BlockKind, string> = {
  instruction: "bg-white border-wood-200",
  support: "bg-cream-100 border-wood-100",
  personalized: "bg-honey-50 border-honey-200",
  planning: "bg-wood-50 border-wood-100",
  homeroom: "bg-cream-50 border-wood-100",
  lunch: "bg-sage-50 border-sage-200",
  transition: "bg-transparent border-transparent",
};

export function BellSchedule() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const weekday = now ? now.getDay() : 1;
  const isSchoolDay = weekday >= 1 && weekday <= 5;
  const activeIdx = now && isSchoolDay ? currentBlockIndex(now) : -1;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-display text-xl text-wood-900">
            Weekly bell schedule
          </h2>
          <p className="text-sm text-wood-600 mt-0.5">
            4×4 block, SY26–27. The 20-minute slice is{" "}
            <span className="font-medium">Targeted support</span> on Mon/Wed/Fri
            and <span className="font-medium">Async</span> on Tue/Thu.
          </p>
        </div>
      </div>

      {now && (
        <p className="flex items-center gap-1.5 text-sm text-terracotta-700 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-2.5 py-1.5 mt-3 mb-4">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {activeIdx >= 0
            ? `Right now: ${blockLabel(BELL_SCHEDULE[activeIdx], weekday)}`
            : "No class block in session right now."}
        </p>
      )}

      <div className="space-y-1 mt-3">
        {BELL_SCHEDULE.map((block, i) => {
          const label = now ? blockLabel(block, weekday) : block.label;
          const active = i === activeIdx;

          if (block.kind === "transition") {
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-0.5 text-[0.7rem] text-wood-400"
              >
                <span className="w-28 flex-shrink-0 tabular-nums">
                  {formatBlockTime(block.start)}
                </span>
                <span className="italic">Transition</span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-cozy border",
                KIND_STYLE[block.kind],
                active ? "ring-2 ring-terracotta-400" : "",
              ].join(" ")}
            >
              <span className="w-28 flex-shrink-0 text-xs tabular-nums text-wood-600">
                {formatBlockTime(block.start)} – {formatBlockTime(block.end)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-wood-900 truncate">
                  {label}
                </p>
                {block.kind === "personalized" && (
                  <p className="text-xs text-wood-600">
                    Async · teacher planning &amp; personalized student work
                  </p>
                )}
              </div>
              {block.period !== null && (
                <span className="flex-shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide-label text-wood-500">
                  Period {block.period}
                </span>
              )}
              {block.minutes > 0 && (
                <span className="flex-shrink-0 text-[0.65rem] font-medium text-wood-500 bg-cream-200 rounded px-1.5 py-0.5">
                  {block.minutes} min
                </span>
              )}
              {active && (
                <span className="flex-shrink-0 text-[0.6rem] font-bold uppercase tracking-wide-label text-terracotta-700">
                  Now
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
