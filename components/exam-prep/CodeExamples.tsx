"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { CodeExample } from "@/lib/exam-prep";

export function CodeExamples({ examples }: { examples: CodeExample[] }) {
  const categories = [
    "All",
    ...Array.from(new Set(examples.map((e) => e.category))).sort(),
  ];
  const [active, setActive] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible =
    active === "All"
      ? examples
      : examples.filter((e) => e.category === active);

  async function copy(ex: CodeExample) {
    try {
      await navigator.clipboard.writeText(ex.code);
      setCopiedId(ex.id);
      setTimeout(() => setCopiedId((c) => (c === ex.id ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="space-y-4">
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={[
                "px-3 py-1 rounded-full text-sm transition-colors",
                active === c
                  ? "bg-terracotta-500 text-white"
                  : "bg-cream-200 text-wood-700 hover:bg-cream-300",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {visible.map((ex) => (
          <Card key={ex.id} padded={false} className="overflow-hidden">
            <div className="p-4 pb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg text-wood-900">
                    {ex.title}
                  </h3>
                  <span className="flex-shrink-0 text-[0.65rem] uppercase tracking-wide-label font-semibold px-2 py-0.5 rounded-cozy bg-cream-200 text-wood-600">
                    {ex.category}
                  </span>
                </div>
                <p className="text-sm text-wood-600 mt-0.5">
                  {ex.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copy(ex)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-wood-600 hover:text-terracotta-700 transition-colors"
              >
                {copiedId === ex.id ? (
                  <Check className="w-3.5 h-3.5 text-sage-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedId === ex.id ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="bg-cream-50 border-t border-wood-200 p-4 overflow-x-auto text-sm font-mono text-wood-900 leading-relaxed">
              {ex.code}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
