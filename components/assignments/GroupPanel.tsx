"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserRound,
  Check,
  Lock,
  Unlock,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { groupLabel, memberName, type AssignmentGroup, type GroupMode } from "@/lib/groups";
import {
  renameGroup,
  closeGroup,
  reopenGroup,
  leaveGroup,
} from "@/app/student/assignments/groups-actions";
import { VoiceChatPanel } from "@/components/assignments/VoiceChatPanel";

interface GroupPanelProps {
  assignmentId: string;
  group: AssignmentGroup;
  mode: GroupMode;
  /** Whether Daily.co is configured server-side — hides voice chat entirely when it isn't. */
  voiceChatEnabled?: boolean;
}

export function GroupPanel({
  assignmentId,
  group,
  mode,
  voiceChatEnabled = false,
}: GroupPanelProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(group.name ?? "");

  const canManage = mode === "choice" && !group.isSolo;
  const isOpen = group.status === "open";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else router.refresh();
    });
  }

  return (
    <Card className="border-terracotta-200 bg-terracotta-50/40">
      <div className="flex items-center gap-2 mb-3">
        {group.isSolo ? (
          <UserRound className="w-4 h-4 text-terracotta-700" strokeWidth={1.75} />
        ) : (
          <Users className="w-4 h-4 text-terracotta-700" strokeWidth={1.75} />
        )}
        <h3 className="font-display text-base text-wood-900">
          {group.isSolo ? "Working solo" : "Your group"}
        </h3>
        {!group.isSolo && (
          <span
            className={[
              "text-[0.6rem] uppercase tracking-wide-label font-semibold px-1.5 py-0.5 rounded-full ml-1",
              isOpen ? "bg-sage-100 text-sage-800" : "bg-wood-200 text-wood-600",
            ].join(" ")}
          >
            {isOpen ? "open" : "closed"}
          </span>
        )}
      </div>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Name — editable for student-choice groups. */}
      {canManage ? (
        <div className="flex items-center gap-2 mb-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={groupLabel(group, 0)}
            className="flex-1"
            maxLength={60}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || name.trim() === (group.name ?? "").trim()}
            onClick={() => run(() => renameGroup(assignmentId, group.id, name))}
          >
            <Check className="w-4 h-4" strokeWidth={2} />
            Save name
          </Button>
        </div>
      ) : (
        !group.isSolo && (
          <p className="text-sm font-medium text-wood-900 mb-2">
            {groupLabel(group, 0)}
          </p>
        )
      )}

      {/* Members */}
      {!group.isSolo && (
        <div className="mb-3">
          <p className="label-eyebrow mb-1.5">
            Members ({group.members.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.members.map((m) => (
              <span
                key={m.userId}
                className="inline-flex items-center rounded-full border border-wood-200 bg-cream-50 px-2.5 py-1 text-xs text-wood-800"
              >
                {memberName(m)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {mode === "choice" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!group.isSolo &&
            (isOpen ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => closeGroup(assignmentId, group.id))}
              >
                <Lock className="w-4 h-4" strokeWidth={2} />
                Close group early
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => reopenGroup(assignmentId, group.id))}
              >
                <Unlock className="w-4 h-4" strokeWidth={2} />
                Reopen
              </Button>
            ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  group.isSolo
                    ? "Leave solo and go back to choosing a group?"
                    : "Leave this group?"
                )
              )
                run(() => leaveGroup(assignmentId, group.id));
            }}
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            {group.isSolo ? "Join a group instead" : "Leave group"}
          </Button>
        </div>
      )}

      {voiceChatEnabled && !group.isSolo && (
        <VoiceChatPanel groupId={group.id} />
      )}

      <p className="text-xs text-wood-500 mt-3 pt-3 border-t border-wood-100">
        For now everyone edits in their own window — shared group editing is
        coming soon.
      </p>
    </Card>
  );
}
