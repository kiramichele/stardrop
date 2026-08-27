"use client";

import { useEffect, useState } from "react";
import { Mic, Radio } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { groupLabel, type AssignmentGroup } from "@/lib/groups";
import {
  getVoiceActivity,
  type VoiceActivityRow,
} from "@/app/teacher/assignments/groups-actions";
import { VoiceChatPanel } from "@/components/assignments/VoiceChatPanel";

const POLL_MS = 12_000;

/**
 * Voice chat, teacher's-eye view: every non-solo group, live participant
 * chips when anyone's actually in a room (polled from Daily's presence
 * API — see getVoiceActivity), and a "Join voice chat" for the teacher
 * to drop in on any group at will — to check in, or just to test it.
 */
export function VoiceActivityPanel({
  assignmentId,
  groups,
}: {
  assignmentId: string;
  groups: AssignmentGroup[];
}) {
  const [activity, setActivity] = useState<VoiceActivityRow[]>([]);
  const nonSolo = groups.filter((g) => !g.isSolo);

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

  if (nonSolo.length === 0) return null;
  const presenceByGroup = new Map(activity.map((row) => [row.groupId, row]));

  return (
    <Card className="border-sage-200 bg-sage-50/40">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-sage-700" strokeWidth={1.75} />
        <h3 className="font-display text-base text-wood-900">Voice chat</h3>
      </div>
      <div className="space-y-3">
        {nonSolo.map((group, idx) => {
          const row = presenceByGroup.get(group.id);
          return (
            <div
              key={group.id}
              className="rounded-cozy border border-wood-100 bg-cream-50 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-wood-800">
                  {groupLabel(group, idx)}
                </span>
                {row && row.participants.length > 0 && (
                  <>
                    <span className="text-wood-400">·</span>
                    {row.participants.map((p, i) => (
                      <span
                        key={`${p.userId ?? p.userName}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full border border-sage-200 bg-white px-2 py-0.5 text-xs text-wood-700"
                      >
                        <Mic className="w-3 h-3 text-sage-600" strokeWidth={2} />
                        {p.userName}
                      </span>
                    ))}
                  </>
                )}
              </div>
              <VoiceChatPanel groupId={group.id} role="teacher" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
