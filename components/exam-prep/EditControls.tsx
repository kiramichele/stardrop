"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** A small icon-only button for inline row actions (edit / delete). */
export function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-1.5 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-cream-200 transition-colors"
    >
      {children}
    </button>
  );
}

/** Save (submit) + Cancel buttons for an inline edit/add form. */
export function SaveCancelButtons({
  onCancel,
  saveLabel = "Save",
}: {
  onCancel: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="submit" size="sm">
        {saveLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
