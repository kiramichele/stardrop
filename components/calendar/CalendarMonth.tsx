"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Presentation } from "lucide-react";
import {
  CATEGORY_META,
  dominantDayType,
  eventCoversDate,
  dateString,
  todayString,
  monthGrid,
  monthLabel,
  monthParam,
  shiftMonth,
  WEEKDAY_LABELS,
  type CalendarCategory,
  type CalendarEvent,
} from "@/lib/calendar";

export type DatedItem = { date: string; id: string; title: string };

interface CalendarMonthProps {
  role: "teacher" | "student";
  year: number;
  month: number;
  events: CalendarEvent[];
  slideshows: DatedItem[];
  assignmentsDue: DatedItem[];
}

const LEGEND_ORDER: CalendarCategory[] = [
  "holiday",
  "teacher_workday",
  "async",
  "eld",
  "testing",
  "event",
  "student_date",
];

export function CalendarMonth({
  year,
  month,
  events,
  slideshows,
  assignmentsDue,
}: CalendarMonthProps) {
  const today = todayString();
  const weeks = monthGrid(year, month);

  const planByDate = new Map(slideshows.map((s) => [s.date, s]));
  const dueByDate = new Map<string, DatedItem[]>();
  for (const a of assignmentsDue) {
    const list = dueByDate.get(a.date) ?? [];
    list.push(a);
    dueByDate.set(a.date, list);
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-wood-900">
          {monthLabel(year, month)}
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/calendar?month=${monthParam(prev.year, prev.month)}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-cozy border border-wood-200 bg-cream-50 text-wood-700 hover:bg-cream-200 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href="/calendar"
            className="rounded-cozy border border-wood-200 bg-cream-50 px-3 h-8 inline-flex items-center text-sm font-medium text-wood-700 hover:bg-cream-200 transition-colors"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${monthParam(next.year, next.month)}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-cozy border border-wood-200 bg-cream-50 text-wood-700 hover:bg-cream-200 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[46rem]">
          <div className="grid grid-cols-7 gap-px">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center label-eyebrow text-wood-500 py-1.5"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-wood-100 rounded-cozy overflow-hidden border border-wood-100">
            {weeks.flat().map((day) => {
              const ds = dateString(day);
              const inMonth = day.getMonth() === month;
              const isToday = ds === today;
              const dayEvents = events.filter((e) => eventCoversDate(e, ds));
              const dayType = dominantDayType(dayEvents);
              const plan = planByDate.get(ds);
              const due = dueByDate.get(ds) ?? [];

              return (
                <div
                  key={ds}
                  className={[
                    "min-h-[6rem] p-1.5 flex flex-col gap-1",
                    dayType ? CATEGORY_META[dayType].cellBg : "bg-cream-50",
                    inMonth ? "" : "opacity-45",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={[
                        "inline-flex items-center justify-center text-xs font-semibold w-5 h-5 rounded-full",
                        isToday
                          ? "bg-terracotta-500 text-white"
                          : "text-wood-700",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </span>
                    {due.length > 0 && (
                      <span
                        className="text-[0.6rem] font-semibold text-honey-800 bg-honey-100 border border-honey-200 rounded px-1 leading-tight"
                        title={due.map((d) => d.title).join(", ")}
                      >
                        {due.length} due
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        title={e.note ? `${e.title} — ${e.note}` : e.title}
                        className={[
                          "text-[0.62rem] leading-tight px-1 py-0.5 rounded border truncate",
                          CATEGORY_META[e.category].chip,
                        ].join(" ")}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[0.6rem] text-wood-500 px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>

                  {plan && (
                    <Link
                      href={`/slideshows/${plan.id}`}
                      title={plan.title}
                      className="mt-auto inline-flex items-center gap-1 text-[0.62rem] font-medium text-terracotta-700 hover:text-terracotta-800"
                    >
                      <Presentation className="w-3 h-3" />
                      <span className="truncate">Plan</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        {LEGEND_ORDER.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 text-xs text-wood-600"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${CATEGORY_META[cat].dot}`}
            />
            {CATEGORY_META[cat].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-wood-600">
          <Presentation className="w-3 h-3 text-terracotta-700" />
          Daily plan posted
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-wood-600">
          <span className="text-[0.6rem] font-semibold text-honey-800 bg-honey-100 border border-honey-200 rounded px-1">
            due
          </span>
          Assignment deadline
        </span>
      </div>
    </div>
  );
}
