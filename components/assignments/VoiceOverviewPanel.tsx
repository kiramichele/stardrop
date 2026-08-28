"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Radio } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { groupLabel, memberName } from "@/lib/groups";
import type { CollaborativeAssignmentGroups } from "@/lib/groups-server";
import { getVoicePresenceForGroupIds } from "@/app/teacher/voice/actions";
import { VoiceChatPanel } from "@/components/assignments/VoiceChatPanel";
import type { VoicePresenceEntry } from "@/lib/voice-server";

const POLL_MS = 12_000;

/**
 * Every collaborative assignment's groups, across every class, with live
 * "who's talking right now" and a Join button on each — the "overall"
 * counterpart to VoiceActivityPanel's per-assignment view.
 */
export function VoiceOverviewPanel({
  assignments,
}: {
  assignments: CollaborativeAssignmentGroups[];
}) {
  const allGroupIds = useMemo(
    () => assignments.flatMap((a) => a.groups.map((g) => g.id)),
    [assignments]
  );
  const [presence, setPresence] = useState<Record<string, VoicePresenceEntry[]>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const result = await getVoicePresenceForGroupIds(allGroupIds);
      if (!cancelled) setPresence(result);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [allGroupIds]);

  const activeCount = Object.values(presence).filter((p) => p.length > 0).length;

  return (
    <div className="space-y-6">
      {activeCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-sage-700">
          <Radio className="w-4 h-4" strokeWidth={2} />
          <span className="font-medium">
            {activeCount} {activeCount === 1 ? "group" : "groups"} talking
            right now
          </span>
        </p>
      )}

      {assignments.map((a) => (
        <Card key={a.assignmentId}>
          <div className="mb-3">
            <h3 className="font-display text-lg text-wood-900">{a.title}</h3>
            {a.className && (
              <p className="text-xs text-wood-500">
                {a.className}
                {a.periodNumber != null ? ` · P${a.periodNumber}` : ""}
              </p>
            )}
          </div>
          <div className="space-y-3">
            {a.groups.map((group, idx) => {
              const live = presence[group.id] ?? [];
              const liveUserIds = new Set(live.map((p) => p.userId));
              return (
                <div
                  key={group.id}
                  className="rounded-cozy border border-wood-100 bg-cream-50 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium text-wood-800">
                      {groupLabel(group, idx)}
                    </span>
                    <span className="text-wood-400">·</span>
                    {group.members.map((m) => {
                      const isLive = liveUserIds.has(m.userId);
                      return (
                        <span
                          key={m.userId}
                          className={[
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                            isLive
                              ? "border-sage-300 bg-sage-50 text-sage-800"
                              : "border-wood-200 bg-white text-wood-600",
                          ].join(" ")}
                        >
                          {isLive && (
                            <Mic
                              className="w-3 h-3 text-sage-600"
                              strokeWidth={2}
                            />
                          )}
                          {memberName(m)}
                        </span>
                      );
                    })}
                  </div>
                  <VoiceChatPanel groupId={group.id} role="teacher" />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
