"use client";

import { useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import type { CalendarEvent } from "@/lib/calendar";
import {
  CalendarMonth,
  type DatedItem,
  type CalendarSlideshow,
} from "./CalendarMonth";
import { BellSchedule } from "@/components/schedule/BellSchedule";

interface CalendarClientProps {
  role: "teacher" | "student";
  year: number;
  month: number;
  events: CalendarEvent[];
  slideshows: CalendarSlideshow[];
  assignmentsDue: DatedItem[];
}

export function CalendarClient(props: CalendarClientProps) {
  const [tab, setTab] = useState<"month" | "schedule">("month");

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-cozy border border-wood-200 bg-cream-50 p-0.5">
        <TabButton
          active={tab === "month"}
          onClick={() => setTab("month")}
          icon={<CalendarDays className="w-4 h-4" strokeWidth={2} />}
          label="Calendar"
        />
        <TabButton
          active={tab === "schedule"}
          onClick={() => setTab("schedule")}
          icon={<Clock className="w-4 h-4" strokeWidth={2} />}
          label="Bell schedule"
        />
      </div>

      {tab === "month" ? (
        <CalendarMonth
          role={props.role}
          year={props.year}
          month={props.month}
          events={props.events}
          slideshows={props.slideshows}
          assignmentsDue={props.assignmentsDue}
        />
      ) : (
        <BellSchedule />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-[0.5rem] px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-terracotta-500 text-white shadow-soft"
          : "text-wood-700 hover:bg-cream-200",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
