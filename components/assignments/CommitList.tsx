"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { CommitDiff } from "@/components/assignments/CommitDiff";
import type {
  CommitSummary,
  CommitVersions,
  FetchCommitVersions,
} from "@/lib/commits";

interface CommitListProps {
  commits: CommitSummary[];
  fetchVersions: FetchCommitVersions;
  /** Optional second comparison, e.g. the student's current or submitted code. */
  compareTo?: { code: string; label: string };
  /** Per-row buttons (e.g. Restore). */
  renderActions?: (commit: CommitSummary) => ReactNode;
  emptyText: ReactNode;
  diffHeight?: string;
  /** Render only the newest N rows (diff labels still see the full list). */
  limit?: number;
}

type View = "changes" | "compare";

/**
 * Newest-first list of commits. Expanding a row shows a diff of what that
 * commit changed (vs. the commit before it) and, when `compareTo` is
 * given, how it differs from that code.
 */
export function CommitList({
  commits,
  fetchVersions,
  compareTo,
  renderActions,
  emptyText,
  diffHeight,
  limit,
}: CommitListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<View>("changes");
  const [versions, setVersions] = useState<
    Record<string, CommitVersions | { error: string }>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(id: string) {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    setView("changes");
    if (versions[id]) return;
    setLoadingId(id);
    const r = await fetchVersions(id);
    setLoadingId(null);
    setVersions((prev) => ({
      ...prev,
      [id]: r.ok ? r.versions : { error: r.error },
    }));
  }

  if (commits.length === 0) {
    return <div className="text-sm text-wood-500">{emptyText}</div>;
  }

  return (
    <ol className="divide-y divide-wood-100">
      {commits.slice(0, limit ?? commits.length).map((c, i) => {
        const isOpen = openId === c.id;
        const v = versions[c.id];
        // History is linear, so the next row down is this commit's parent.
        const parent = commits[i + 1];
        return (
          <li key={c.id} className="py-3">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className="flex-1 min-w-0 text-left group"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-1.5">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-wood-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-wood-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-wood-900 truncate group-hover:underline">
                    {c.message}
                  </span>
                  {i === 0 && (
                    <span className="text-[10px] uppercase tracking-wide bg-sage-100 text-sage-800 rounded px-1.5 py-0.5 flex-shrink-0">
                      Latest
                    </span>
                  )}
                </div>
                <div className="pl-5 mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-wood-500">
                  <time
                    dateTime={c.createdAt}
                    title={new Date(c.createdAt).toLocaleString()}
                    suppressHydrationWarning
                  >
                    {formatWhen(c.createdAt)}
                  </time>
                  <span className="font-mono">
                    <span className="text-sage-700">+{c.added}</span>{" "}
                    <span className="text-terracotta-700">−{c.removed}</span>{" "}
                    lines
                  </span>
                  {c.restoredFromMessage && (
                    <span className="italic">
                      restored from &ldquo;{c.restoredFromMessage}&rdquo;
                    </span>
                  )}
                </div>
              </button>
              {renderActions?.(c)}
            </div>

            {isOpen && (
              <div className="mt-3 pl-5 space-y-2">
                {compareTo && (
                  <div
                    role="tablist"
                    className="inline-flex rounded-cozy border border-wood-200 bg-cream-100 p-0.5 text-xs"
                  >
                    <TabButton
                      active={view === "changes"}
                      onClick={() => setView("changes")}
                    >
                      What changed
                    </TabButton>
                    <TabButton
                      active={view === "compare"}
                      onClick={() => setView("compare")}
                    >
                      Compare with {compareTo.label.toLowerCase()}
                    </TabButton>
                  </div>
                )}

                {loadingId === c.id || !v ? (
                  <p className="flex items-center gap-2 text-xs text-wood-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                  </p>
                ) : "error" in v ? (
                  <p className="flex items-center gap-1.5 text-xs text-terracotta-800">
                    <AlertCircle className="w-3.5 h-3.5" /> {v.error}
                  </p>
                ) : view === "compare" && compareTo ? (
                  <CommitDiff
                    before={v.code}
                    after={compareTo.code}
                    beforeLabel={`This commit: ${c.message}`}
                    afterLabel={compareTo.label}
                    height={diffHeight}
                  />
                ) : (
                  <CommitDiff
                    before={v.parentCode}
                    after={v.code}
                    beforeLabel={
                      parent ? `Previous: ${parent.message}` : "Empty (first commit)"
                    }
                    afterLabel={`This commit: ${c.message}`}
                    height={diffHeight}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-[0.4rem] transition-colors ${
        active
          ? "bg-cream-50 text-wood-900 shadow-sm"
          : "text-wood-600 hover:text-wood-900"
      }`}
    >
      {children}
    </button>
  );
}

export function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
