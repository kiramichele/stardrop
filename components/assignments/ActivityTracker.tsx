"use client";

import { useEffect, useRef } from "react";
import { recordActivityPing } from "@/app/student/assignments/actions";

const PING_INTERVAL_MS = 60_000;
// Only count a minute as "on task" if the student interacted recently.
const IDLE_CUTOFF_MS = 120_000;

/**
 * Invisible component. While a student has an assignment open and is
 * actively working (tab visible + recent interaction), it logs one
 * activity ping per minute. The teacher's analytics turn these into
 * time-on-task. Renders nothing.
 */
export function ActivityTracker({ assignmentId }: { assignmentId: string }) {
  const lastInteraction = useRef(Date.now());

  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    const events = [
      "keydown",
      "mousedown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    for (const e of events) {
      window.addEventListener(e, mark, { passive: true });
    }

    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInteraction.current > IDLE_CUTOFF_MS) return;
      void recordActivityPing(assignmentId);
    }, PING_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      for (const e of events) window.removeEventListener(e, mark);
    };
  }, [assignmentId]);

  return null;
}
