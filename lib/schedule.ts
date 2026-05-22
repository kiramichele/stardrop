// Client-safe: the fixed weekly 4x4 block bell schedule (SGB SY26-27).
// "Yes we are still on a 4X4 block schedule."

export type BlockKind =
  | "planning"
  | "homeroom"
  | "transition"
  | "instruction"
  | "support"
  | "personalized"
  | "lunch";

export type ScheduleBlock = {
  label: string;
  start: string; // 24h "HH:MM"
  end: string;
  period: number | null;
  kind: BlockKind;
  /** Instructional minutes, per the district bell schedule. */
  minutes: number;
};

/** The bell schedule, top to bottom. Identical Mon-Fri except the 20-min
 *  support slices — see {@link supportLabel}. */
export const BELL_SCHEDULE: ScheduleBlock[] = [
  { label: "Teacher Planning", start: "07:45", end: "08:05", period: null, kind: "planning", minutes: 0 },
  { label: "Homeroom", start: "08:05", end: "08:25", period: null, kind: "homeroom", minutes: 0 },
  { label: "Transition", start: "08:25", end: "08:30", period: null, kind: "transition", minutes: 0 },
  { label: "Direct Instruction", start: "08:30", end: "09:15", period: 1, kind: "instruction", minutes: 45 },
  { label: "Targeted support / Async", start: "09:15", end: "09:35", period: 1, kind: "support", minutes: 20 },
  { label: "Transition", start: "09:35", end: "09:40", period: null, kind: "transition", minutes: 0 },
  { label: "Direct Instruction", start: "09:40", end: "10:30", period: 2, kind: "instruction", minutes: 45 },
  { label: "Targeted support / Async", start: "10:30", end: "10:50", period: 2, kind: "support", minutes: 20 },
  { label: "Personalized Learning", start: "10:50", end: "12:00", period: 3, kind: "personalized", minutes: 70 },
  { label: "Lunch", start: "12:00", end: "13:00", period: null, kind: "lunch", minutes: 0 },
  { label: "Direct Instruction", start: "13:00", end: "13:45", period: 4, kind: "instruction", minutes: 45 },
  { label: "Targeted support / Async", start: "13:45", end: "14:05", period: 4, kind: "support", minutes: 20 },
  { label: "Transition", start: "14:05", end: "14:10", period: null, kind: "transition", minutes: 0 },
  { label: "Direct Instruction", start: "14:10", end: "14:55", period: 5, kind: "instruction", minutes: 45 },
  { label: "Targeted support / Async", start: "14:55", end: "15:15", period: 5, kind: "support", minutes: 20 },
  { label: "Teacher Planning", start: "15:15", end: "15:45", period: null, kind: "planning", minutes: 0 },
];

/**
 * The 20-min support slice is "Targeted support" Mon/Wed/Fri and
 * "Async" Tue/Thu. `weekday` is 0=Sun .. 6=Sat (Date.getDay()).
 */
export function supportLabel(weekday: number): "Targeted support" | "Async" {
  return weekday === 2 || weekday === 4 ? "Async" : "Targeted support";
}

/** Resolve a block's display label for a given weekday. */
export function blockLabel(block: ScheduleBlock, weekday: number): string {
  return block.kind === "support" ? supportLabel(weekday) : block.label;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** "13:45" -> "1:45 PM" */
export function formatBlockTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Index of the schedule block containing `now` (local time), or -1 if
 * before the first block / after the last.
 */
export function currentBlockIndex(now: Date): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  return BELL_SCHEDULE.findIndex(
    (b) => mins >= toMinutes(b.start) && mins < toMinutes(b.end)
  );
}
