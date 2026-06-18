"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  PORTFOLIO_FILTERS,
  type PortfolioFilter,
} from "@/lib/starhub";

export type FeedItem = {
  id: string;
  bucket: PortfolioFilter;
  /** Pre-rendered server card. */
  node: ReactNode;
};

/**
 * Client wrapper that owns filter-tab state. The cards themselves are
 * server-rendered (CodeBlock uses shiki) and arrive as ReactNodes — we
 * just show/hide based on the active tab.
 */
export function PortfolioFeed({
  items,
  isOwner,
}: {
  items: FeedItem[];
  isOwner: boolean;
}) {
  const [active, setActive] = useState<PortfolioFilter>("all");

  const buckets = useMemo(() => {
    const counts = new Map<PortfolioFilter, number>();
    for (const it of items) {
      counts.set(it.bucket, (counts.get(it.bucket) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const visible =
    active === "all" ? items : items.filter((it) => it.bucket === active);

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Sparkles}
          title={isOwner ? "Your StarHub is empty" : "No public entries yet"}
          description={
            isOwner
              ? "Submit an assignment that's set to auto-publish, or post a code gist to get started."
              : "When this student shares work publicly it will show up here."
          }
        />
      </Card>
    );
  }

  // Only show tabs the user has entries in (plus "All").
  const tabs = [
    { key: "all" as PortfolioFilter, label: "All", count: items.length },
    ...PORTFOLIO_FILTERS.filter((f) => f.key !== "all" && buckets.has(f.key)).map(
      (f) => ({
        key: f.key,
        label: f.label,
        count: buckets.get(f.key) ?? 0,
      })
    ),
  ];

  return (
    <div>
      {tabs.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                active === tab.key
                  ? "border-terracotta-300 bg-terracotta-100 font-medium text-terracotta-800"
                  : "border-wood-200 bg-cream-50 text-wood-600 hover:border-terracotta-300 hover:text-terracotta-700",
              ].join(" ")}
            >
              {tab.label}
              <span
                className={
                  active === tab.key
                    ? "text-terracotta-500"
                    : "text-wood-400"
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {visible.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-wood-500">
              Nothing in this filter yet.
            </p>
          </Card>
        ) : (
          visible.map((it) => <div key={it.id}>{it.node}</div>)
        )}
      </div>
    </div>
  );
}
