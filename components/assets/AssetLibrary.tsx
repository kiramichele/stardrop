"use client";

import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSET_CATEGORIES, type AssetView } from "@/lib/assets";
import { AssetCard } from "./AssetCard";

/**
 * The asset grid with category filter tabs. Only categories that actually
 * have assets get a tab.
 */
export function AssetLibrary({
  assets,
  isTeacher,
  currentUserId,
}: {
  assets: AssetView[];
  isTeacher: boolean;
  currentUserId: string;
}) {
  const [active, setActive] = useState<string>("all");

  // Counts per category — drives which tabs to show.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      map.set(a.category, (map.get(a.category) ?? 0) + 1);
    }
    return map;
  }, [assets]);

  const visible =
    active === "all"
      ? assets
      : assets.filter((a) => a.category === active);

  if (assets.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Boxes}
          title="The library is empty"
          description="No assets yet. Add the first sprite, sound, template, or a link to a resource you love."
        />
      </Card>
    );
  }

  const tabs = [
    { key: "all", label: "All", count: assets.length },
    ...ASSET_CATEGORIES.filter((c) => counts.has(c.key)).map((c) => ({
      key: c.key,
      label: c.label,
      count: counts.get(c.key) ?? 0,
    })),
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={[
              "rounded-full border px-3 py-1 text-sm transition-colors",
              active === tab.key
                ? "border-terracotta-300 bg-terracotta-100 font-medium text-terracotta-800"
                : "border-wood-200 bg-cream-50 text-wood-600 hover:border-terracotta-300 hover:text-terracotta-700",
            ].join(" ")}
          >
            {tab.label}
            <span
              className={
                active === tab.key ? "text-terracotta-500" : "text-wood-400"
              }
            >
              {" "}
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-wood-500">
            Nothing in this category yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isTeacher={isTeacher}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
