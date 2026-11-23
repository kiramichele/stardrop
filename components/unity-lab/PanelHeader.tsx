import type { ReactNode } from "react";

/** Small Unity-style panel title bar. */
export function PanelHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 h-8 border-b border-wood-200 bg-cream-100 flex-shrink-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-wood-600">
        {title}
      </span>
      {children}
    </div>
  );
}
