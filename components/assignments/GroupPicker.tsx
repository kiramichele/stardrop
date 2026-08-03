"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, UserRound, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { groupLabel, memberName, type AssignmentGroup } from "@/lib/groups";
import {
  createOpenGroup,
  joinGroup,
  workSolo,
} from "@/app/student/assignments/groups-actions";

interface GroupPickerProps {
  assignmentId: string;
  /** Open, non-solo groups a student can join. */
  groups: AssignmentGroup[];
  allowSolo: boolean;
  maxGroupSize: number | null;
}

export function GroupPicker({
  assignmentId,
  groups,
  allowSolo,
  maxGroupSize,
}: GroupPickerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong");
      else router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-terracotta-700" strokeWidth={1.75} />
        <h2 className="font-display text-xl text-wood-900">
          Join a group to start
        </h2>
      </div>
      <p className="text-sm text-wood-600 mb-4">
        Join an open group below, start your own
        {allowSolo ? ", or work solo" : ""}.
      </p>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Open groups to join */}
      <div className="space-y-2 mb-5">
        {groups.length === 0 ? (
          <p className="text-sm text-wood-500 italic">
            No open groups yet — be the first to start one.
          </p>
        ) : (
          groups.map((g, i) => {
            const full =
              maxGroupSize != null && g.members.length >= maxGroupSize;
            return (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-cozy border border-wood-200 bg-cream-50 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wood-900 truncate">
                    {groupLabel(g, i)}
                  </p>
                  <p className="text-xs text-wood-500 truncate">
                    {g.members.map(memberName).join(", ") || "No members yet"}
                  </p>
                </div>
                <span className="text-xs text-wood-500 flex-shrink-0">
                  {g.members.length}
                  {maxGroupSize != null ? `/${maxGroupSize}` : ""}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending || full}
                  onClick={() => run(() => joinGroup(assignmentId, g.id))}
                >
                  {full ? "Full" : "Join"}
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Start a new group */}
      <div className="rounded-cozy border border-dashed border-wood-300 bg-cream-50 p-3">
        <p className="text-sm font-medium text-wood-800 mb-2">Start a new group</p>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name (optional)"
            className="flex-1"
            maxLength={60}
          />
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => createOpenGroup(assignmentId, newName || undefined))
            }
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Create
          </Button>
        </div>
      </div>

      {allowSolo && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-cozy border border-wood-200 bg-cream-50 px-3 py-2.5">
          <p className="text-sm text-wood-700">
            Prefer to work on your own?
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => workSolo(assignmentId))}
          >
            <UserRound className="w-4 h-4" strokeWidth={2} />
            Work solo
          </Button>
        </div>
      )}
    </Card>
  );
}
