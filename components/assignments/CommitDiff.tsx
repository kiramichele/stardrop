"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { setupMonaco } from "@/lib/monaco/setup";

// Lazy-load — Monaco touches `window` at import time.
const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  { ssr: false, loading: () => <DiffLoading /> }
);

function DiffLoading() {
  return (
    <div className="flex items-center justify-center h-full text-wood-500 gap-2 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading diff…
    </div>
  );
}

interface CommitDiffProps {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  height?: string;
}

/**
 * Read-only side-by-side diff (removed lines red on the left, added lines
 * green on the right). Falls back to an inline view on narrow screens and
 * folds long unchanged stretches so the changes stand out.
 */
export function CommitDiff({
  before,
  after,
  beforeLabel,
  afterLabel,
  height = "360px",
}: CommitDiffProps) {
  const identical = before === after;
  return (
    <div className="rounded-cozy border border-wood-200 overflow-hidden bg-white">
      <div className="grid grid-cols-2 text-xs bg-cream-100 border-b border-wood-100">
        <span className="px-3 py-1.5 text-terracotta-800 truncate">
          − {beforeLabel}
        </span>
        <span className="px-3 py-1.5 text-sage-800 truncate border-l border-wood-100">
          + {afterLabel}
        </span>
      </div>
      {identical ? (
        <p className="px-3 py-4 text-sm text-wood-500 text-center">
          No differences — these two versions are identical.
        </p>
      ) : (
        <div style={{ height }}>
          <DiffEditor
            height="100%"
            language="csharp"
            original={before}
            modified={after}
            theme="stardrop-cozy"
            beforeMount={setupMonaco}
            options={{
              readOnly: true,
              originalEditable: false,
              renderSideBySide: true,
              useInlineViewWhenSpaceIsLimited: true,
              renderSideBySideInlineBreakpoint: 560,
              hideUnchangedRegions: { enabled: true, contextLineCount: 3 },
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 13,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace',
              renderOverviewRuler: false,
              lineNumbersMinChars: 3,
              padding: { top: 8, bottom: 8 },
            }}
          />
        </div>
      )}
    </div>
  );
}
