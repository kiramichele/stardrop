"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  X,
  BookOpen,
  ClipboardList,
  Presentation,
  ArrowRight,
} from "lucide-react";
import {
  CATEGORY_META,
  dominantDayType,
  type CalendarEvent,
} from "@/lib/calendar";
import { formatClassDate } from "@/lib/slideshows";
import type { CalendarSlideshow, DatedItem } from "./CalendarMonth";

interface DayDetailModalProps {
  date: string;
  role: "teacher" | "student";
  events: CalendarEvent[];
  slideshow: CalendarSlideshow | null;
  assignmentsDue: DatedItem[];
  onClose: () => void;
}

export function DayDetailModal({
  date,
  role,
  events,
  slideshow,
  assignmentsDue,
  onClose,
}: DayDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const lessonBase = role === "teacher" ? "/teacher/lessons" : "/student/lessons";
  const assignmentBase =
    role === "teacher" ? "/teacher/assignments" : "/student/assignments";
  const dayType = dominantDayType(events);
  const isEmpty =
    events.length === 0 && !slideshow && assignmentsDue.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-wood-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-cozy-lg shadow-cozy-lg border border-wood-100 w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <p className="label-eyebrow text-wood-500">Day plan</p>
            <h2 className="font-display text-xl text-wood-900 leading-tight">
              {formatClassDate(date)}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-cozy text-wood-500 hover:bg-cream-200 hover:text-wood-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {dayType && (
            <span
              className={`inline-block text-[0.65rem] font-semibold uppercase tracking-wide-label px-2 py-0.5 rounded-full border ${CATEGORY_META[dayType].chip}`}
            >
              {CATEGORY_META[dayType].label}
            </span>
          )}

          {events.length > 0 && (
            <section>
              <p className="label-eyebrow text-wood-500 mb-1.5">
                On the calendar
              </p>
              <div className="space-y-1.5">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`text-xs px-2 py-1.5 rounded-cozy border ${CATEGORY_META[e.category].chip}`}
                  >
                    <span className="font-medium">{e.title}</span>
                    {e.note && <span className="opacity-80"> — {e.note}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {slideshow && (
            <section>
              <p className="label-eyebrow text-wood-500 mb-1.5">
                Today&apos;s slideshow
              </p>
              <div className="rounded-cozy border border-honey-200 bg-honey-50 p-3">
                <h3 className="font-display text-base text-wood-900">
                  {slideshow.title}
                </h3>
                {slideshow.description && (
                  <p className="text-sm text-wood-700 mt-1 whitespace-pre-wrap">
                    {slideshow.description}
                  </p>
                )}

                {slideshow.lessons.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    {slideshow.lessons.map((l) => (
                      <Link
                        key={l.id}
                        href={`${lessonBase}/${l.id}`}
                        className="flex items-center gap-1.5 text-sm text-wood-700 hover:text-terracotta-700"
                      >
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-sage-600" />
                        <span className="truncate">{l.title}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {slideshow.assignments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {slideshow.assignments.map((a) => (
                      <Link
                        key={a.id}
                        href={`${assignmentBase}/${a.id}`}
                        className="flex items-center gap-1.5 text-sm text-wood-700 hover:text-terracotta-700"
                      >
                        <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 text-honey-600" />
                        <span className="truncate">{a.title}</span>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href={`/slideshows/${slideshow.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  Open slideshow
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          )}

          {assignmentsDue.length > 0 && (
            <section>
              <p className="label-eyebrow text-wood-500 mb-1.5">Due this day</p>
              <div className="space-y-1">
                {assignmentsDue.map((a) => (
                  <Link
                    key={a.id}
                    href={`${assignmentBase}/${a.id}`}
                    className="flex items-center gap-1.5 text-sm text-wood-700 hover:text-terracotta-700"
                  >
                    <ClipboardList className="w-3.5 h-3.5 flex-shrink-0 text-honey-700" />
                    <span className="truncate">{a.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {isEmpty && (
            <p className="text-sm text-wood-500 py-2">
              Nothing scheduled for this day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
