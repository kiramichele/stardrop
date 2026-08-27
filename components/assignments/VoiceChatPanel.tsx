"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff, Loader2, AlertCircle } from "lucide-react";
import type { DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/Button";
import { joinVoiceRoom } from "@/app/student/assignments/groups-actions";
import { joinVoiceRoomAsTeacher } from "@/app/teacher/assignments/groups-actions";

/**
 * Optional voice chat for a group. Off by default — nothing loads (no
 * mic permission prompt, no Daily SDK) until someone clicks "Join voice
 * chat". Camera starts off (this is voice chat, not video call), though
 * Daily's own controls let anyone turn it on if they want to.
 *
 * `role="teacher"` lets a teacher drop into a group's room too (to check
 * in, or just to test the feature) — it's a visible join like anyone
 * else's, not a silent listen-in, since Daily shows every participant's
 * name in the room.
 *
 * Server-verified join/leave logging happens out-of-band via Daily's
 * webhooks (see app/api/webhooks/daily/route.ts) — this component
 * doesn't need to report anything itself for that to work.
 */
export function VoiceChatPanel({
  groupId,
  role = "student",
}: {
  groupId: string;
  role?: "student" | "teacher";
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "in-call" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    return () => {
      callRef.current?.destroy();
    };
  }, []);

  async function join() {
    setStatus("connecting");
    setError(null);
    const result =
      role === "teacher"
        ? await joinVoiceRoomAsTeacher(groupId)
        : await joinVoiceRoom(groupId);
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    try {
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      const container = containerRef.current;
      if (!container) throw new Error("Couldn't set up the call window.");

      const call = DailyIframe.createFrame(container, {
        iframeStyle: {
          width: "100%",
          height: "360px",
          border: "0",
          borderRadius: "12px",
        },
        showLeaveButton: true,
      });
      callRef.current = call;
      call.on("left-meeting", () => {
        call.destroy();
        callRef.current = null;
        setStatus("idle");
      });

      await call.join({ url: result.roomUrl, token: result.token });
      setStatus("in-call");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't join voice chat.");
    }
  }

  function leave() {
    callRef.current?.leave();
  }

  return (
    <div className="mt-3 pt-3 border-t border-terracotta-100">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-wood-800">
          <Mic className="w-3.5 h-3.5 text-terracotta-700" strokeWidth={1.75} />
          Voice chat
        </p>
        {status === "idle" && (
          <Button type="button" size="sm" onClick={join}>
            <Mic className="w-3.5 h-3.5" strokeWidth={2} />
            Join voice chat
          </Button>
        )}
        {status === "connecting" && (
          <Button type="button" size="sm" disabled>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Connecting…
          </Button>
        )}
        {status === "in-call" && (
          <Button type="button" size="sm" variant="danger" onClick={leave}>
            <PhoneOff className="w-3.5 h-3.5" strokeWidth={2} />
            Leave
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-wood-500">
        {role === "teacher"
          ? "Drop in on this group's call — you'll show up as a visible participant, not a silent listener."
          : "Optional — join anytime to talk through the assignment with your group."}{" "}
        Camera starts off; turn it on in the call if you want.
      </p>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      <div ref={containerRef} className={status === "in-call" ? "mt-3" : ""} />
    </div>
  );
}
