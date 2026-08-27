"use client";

import { useEffect, useState } from "react";
import { Mic, Radio } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { groupLabel, type AssignmentGroup } from "@/lib/groups";
import {
  getVoiceActivity,
  type VoiceActivityRow,
} from "@/app/teacher/assignments/groups-actions";

const POLL_MS = 12_000;

/**
 * Live "who's in voice chat right now" for a teacher, polled straight
 * from Daily's presence API (see getVoiceActivity) rather than pushed —
 * good enough for an at-a-glance check, no websocket plumbing needed.
 * Renders nothing when nobody's currently in a voice room.
 */
export function VoiceActivityPanel({
  assignmentId,
  groups,
}: {
  assignmentId: string;
  groups: AssignmentGroup[];
}) {
  const [activity, setActivity] = useState<VoiceActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const rows = await getVoiceActivity(assignmentId);
      if (!cancelled) setActivity(rows);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [assignmentId]);

  if (activity.length === 0) return null;

  return (
    <Card className="border-sage-200 bg-sage-50/40">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-sage-700" strokeWidth={1.75} />
        <h3 className="font-display text-base text-wood-900">
          Voice chat right now
        </h3>
      </div>
      <div className="space-y-2">
        {activity.map((row) => {
          const idx = groups.findIndex((g) => g.id === row.groupId);
          const group = groups[idx];
          return (
            <div
              key={row.groupId}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="font-medium text-wood-800">
                {group ? groupLabel(group, idx) : "Group"}
              </span>
              <span className="text-wood-400">·</span>
              {row.participants.map((p, i) => (
                <span
                  key={`${p.userId ?? p.userName}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-sage-200 bg-cream-50 px-2 py-0.5 text-xs text-wood-700"
                >
                  <Mic className="w-3 h-3 text-sage-600" strokeWidth={2} />
                  {p.userName}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
