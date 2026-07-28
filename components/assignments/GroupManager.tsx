"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shuffle,
  Plus,
  X,
  Lock,
  Unlock,
  Trash2,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  GROUP_MODE_LABELS,
  groupLabel,
  memberName,
  type AssignmentGroup,
  type GroupMode,
} from "@/lib/groups";
import {
  generateRandomGroups,
  createGroup,
  deleteGroup,
  moveMember,
  renameGroup,
  setGroupStatus,
} from "@/app/teacher/assignments/groups-actions";

type Roster = { id: string; firstName: string; lastName: string };

interface GroupManagerProps {
  assignmentId: string;
  mode: GroupMode;
  maxGroupSize: number | null;
  groups: AssignmentGroup[];
  roster: Roster[];
}

export function GroupManager({
  assignmentId,
  mode,
  maxGroupSize,
  groups,
  roster,
}: GroupManagerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grouped = new Set(
    groups.flatMap((g) => g.members.map((m) => m.userId))
  );
  const ungrouped = roster.filter((s) => !grouped.has(s.id));

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
        <Users className="w-4 h-4 text-terracotta-700" strokeWidth={1.75} />
        <h3 className="font-display text-lg text-wood-900">Groups</h3>
        <span className="text-xs text-wood-500 ml-auto">
          {GROUP_MODE_LABELS[mode]}
          {maxGroupSize != null && ` · max ${maxGroupSize}`}
        </span>
      </div>

      {mode === "random" && (
        <p className="text-xs text-wood-500 mb-3">
          Randomly split the class into groups. Regenerating replaces the
          current set.
        </p>
      )}
      {mode === "manual" && (
        <p className="text-xs text-wood-500 mb-3">
          Drag students between the pool and groups. Add as many groups as you
          need.
        </p>
      )}
      {mode === "choice" && (
        <p className="text-xs text-wood-500 mb-3">
          Students form their own groups. You can rename, close, or clear any
          group here.
        </p>
      )}

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {mode === "random" && (
        <div className="mb-3">
          <Button
            type="button"
            size="sm"
            onClick={() => run(() => generateRandomGroups(assignmentId))}
            disabled={pending}
          >
            <Shuffle className="w-4 h-4" strokeWidth={2} />
            {groups.length > 0 ? "Regenerate groups" : "Generate random groups"}
          </Button>
        </div>
      )}

      {(mode === "manual" || mode === "random" || mode === "choice") && (
        <div className="space-y-2.5">
          {/* Unassigned pool — a drop target in manual mode. */}
          {(mode === "manual" || ungrouped.length > 0) && (
            <DropColumn
              title={`Unassigned (${ungrouped.length})`}
              muted
              droppable={mode === "manual"}
              onDropUser={(userId) =>
                run(() => moveMember(assignmentId, userId, null))
              }
            >
              {ungrouped.length === 0 ? (
                <p className="text-xs text-wood-400 px-1 py-2">
                  Everyone&apos;s in a group.
                </p>
              ) : (
                ungrouped.map((s) => (
                  <MemberChip
                    key={s.id}
                    label={`${s.firstName} ${s.lastName}`.trim()}
                    draggable={mode === "manual"}
                    userId={s.id}
                  />
                ))
              )}
            </DropColumn>
          )}

          {groups.map((g, i) => (
            <DropColumn
              key={g.id}
              title={groupLabel(g, i)}
              droppable={mode === "manual"}
              onDropUser={(userId) =>
                run(() => moveMember(assignmentId, userId, g.id))
              }
              badge={
                g.isSolo
                  ? "solo"
                  : g.status === "closed"
                    ? "closed"
                    : "open"
              }
              count={`${g.members.length}${maxGroupSize != null ? `/${maxGroupSize}` : ""}`}
              actions={
                <>
                  <IconBtn
                    title="Rename"
                    onClick={() => {
                      const name = window.prompt(
                        "Group name:",
                        g.name ?? ""
                      );
                      if (name !== null)
                        run(() => renameGroup(assignmentId, g.id, name));
                    }}
                    disabled={pending}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </IconBtn>
                  <IconBtn
                    title={g.status === "closed" ? "Reopen" : "Close"}
                    onClick={() =>
                      run(() =>
                        setGroupStatus(
                          assignmentId,
                          g.id,
                          g.status === "closed" ? "open" : "closed"
                        )
                      )
                    }
                    disabled={pending}
                  >
                    {g.status === "closed" ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </IconBtn>
                  <IconBtn
                    title="Delete group"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this group? Its members go back to unassigned."
                        )
                      )
                        run(() => deleteGroup(assignmentId, g.id));
                    }}
                    disabled={pending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconBtn>
                </>
              }
            >
              {g.members.length === 0 ? (
                <p className="text-xs text-wood-400 px-1 py-2">Empty</p>
              ) : (
                g.members.map((m) => (
                  <MemberChip
                    key={m.userId}
                    label={memberName(m)}
                    draggable={mode === "manual"}
                    userId={m.userId}
                    onRemove={
                      mode === "manual" || mode === "choice"
                        ? () => run(() => moveMember(assignmentId, m.userId, null))
                        : undefined
                    }
                  />
                ))
              )}
            </DropColumn>
          ))}

          {mode === "manual" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => run(() => createGroup(assignmentId))}
              disabled={pending}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add a group
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function DropColumn({
  title,
  count,
  badge,
  muted,
  droppable,
  onDropUser,
  actions,
  children,
}: {
  title: string;
  count?: string;
  badge?: "open" | "closed" | "solo";
  muted?: boolean;
  droppable?: boolean;
  onDropUser?: (userId: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={
        droppable
          ? (e) => {
              e.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={droppable ? () => setOver(false) : undefined}
      onDrop={
        droppable
          ? (e) => {
              e.preventDefault();
              setOver(false);
              const userId = e.dataTransfer.getData("text/plain");
              if (userId && onDropUser) onDropUser(userId);
            }
          : undefined
      }
      className={[
        "rounded-cozy border p-2 transition-colors",
        muted ? "bg-cream-100 border-wood-200" : "bg-white border-wood-200",
        over ? "border-terracotta-400 bg-terracotta-50" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 px-1 mb-1.5">
        <span className="text-sm font-medium text-wood-800 truncate">
          {title}
        </span>
        {count && <span className="text-xs text-wood-400">{count}</span>}
        {badge && (
          <span
            className={[
              "text-[0.6rem] uppercase tracking-wide-label font-semibold px-1.5 py-0.5 rounded-full",
              badge === "open"
                ? "bg-sage-100 text-sage-800"
                : badge === "closed"
                  ? "bg-wood-200 text-wood-600"
                  : "bg-honey-100 text-honey-800",
            ].join(" ")}
          >
            {badge}
          </span>
        )}
        {actions && <span className="ml-auto flex items-center gap-0.5">{actions}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function MemberChip({
  label,
  userId,
  draggable,
  onRemove,
}: {
  label: string;
  userId: string;
  draggable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => e.dataTransfer.setData("text/plain", userId)
          : undefined
      }
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-wood-200 bg-cream-50 pl-2.5 pr-1.5 py-1 text-xs text-wood-800",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
      ].join(" ")}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-wood-400 hover:text-terracotta-700"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center w-6 h-6 rounded text-wood-500 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}
