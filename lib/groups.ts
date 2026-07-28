// Client-safe collaborative-group types + pure helpers.

export type GroupMode = "random" | "manual" | "choice";
export type GroupStatus = "open" | "closed";

export type GroupMember = {
  userId: string;
  firstName: string;
  lastName: string;
};

export type AssignmentGroup = {
  id: string;
  name: string | null;
  status: GroupStatus;
  isSolo: boolean;
  createdBy: string | null;
  members: GroupMember[];
};

export type CollabConfig = {
  collaborative: boolean;
  groupMode: GroupMode | null;
  maxGroupSize: number | null;
  allowSolo: boolean;
};

export const GROUP_MODE_LABELS: Record<GroupMode, string> = {
  random: "Random groups",
  manual: "I assign the groups",
  choice: "Students choose",
};

/** Read the collaborative config off a raw assignment row, defensively. */
export function readCollabConfig(row: unknown): CollabConfig {
  const r = (row ?? {}) as Record<string, unknown>;
  const mode = r.group_mode;
  return {
    collaborative: r.collaborative === true,
    groupMode:
      mode === "random" || mode === "manual" || mode === "choice"
        ? mode
        : null,
    maxGroupSize:
      typeof r.max_group_size === "number" ? r.max_group_size : null,
    allowSolo: r.allow_solo === true,
  };
}

/** Display name for a group, with a stable fallback. */
export function groupLabel(
  g: { name: string | null; isSolo: boolean },
  index: number
): string {
  if (g.isSolo) return "Solo";
  return g.name?.trim() || `Group ${index + 1}`;
}

/** Full name for a member, falling back to something non-empty. */
export function memberName(m: GroupMember): string {
  return `${m.firstName} ${m.lastName}`.trim() || "Student";
}

/**
 * Split ids into balanced groups of at most `maxSize`. Round-robin so the
 * sizes come out even (7 with max 3 → 3/2/2, not 3/3/1). Shuffle the ids
 * before calling for randomness.
 */
export function partitionIntoGroups(
  ids: string[],
  maxSize: number
): string[][] {
  const size = Math.max(1, Math.floor(maxSize));
  if (ids.length === 0) return [];
  const groupCount = Math.ceil(ids.length / size);
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  ids.forEach((id, i) => {
    groups[i % groupCount].push(id);
  });
  return groups;
}
