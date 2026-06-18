"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

/**
 * Destructive-action modal that requires the user to type a confirmation
 * word (default "delete") before the delete button enables. Esc closes,
 * Enter submits when the word matches.
 */
export function ConfirmTypedDelete({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemCount,
  itemNoun = "item",
  pending = false,
  error,
  confirmWord = "delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  itemCount: number;
  /** Singular noun for the button label, e.g. "assignment". */
  itemNoun?: string;
  pending?: boolean;
  error?: string | null;
  /** Word the user must type to confirm — compared case-insensitive. */
  confirmWord?: string;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === confirmWord.toLowerCase();

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  const buttonLabel = pending
    ? "Deleting…"
    : itemCount === 1
      ? `Delete this ${itemNoun}`
      : `Delete ${itemCount} ${itemNoun}s`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wood-900/40 p-4 animate-fade-in"
      onClick={pending ? undefined : onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-cozy-lg border border-terracotta-200 bg-cream-50 p-6 shadow-cozy-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2
            id="confirm-delete-title"
            className="flex-1 font-display text-xl leading-tight text-wood-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-wood-500 transition-colors hover:text-terracotta-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 text-sm text-wood-700">{description}</div>

        <div className="mb-4">
          <Label htmlFor="confirm-typed-delete">
            Type{" "}
            <span className="rounded bg-terracotta-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-terracotta-800">
              {confirmWord}
            </span>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-typed-delete"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches && !pending) {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-terracotta-800">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!matches || pending}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
