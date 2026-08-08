"use client";

import { useState, useTransition } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { setPortfolioPublic } from "@/app/starhub/actions";

/**
 * Owner-only control: opt in/out of a no-login share link to this
 * portfolio. Off by default, same spirit as the per-post "share with
 * class" toggles — this is just the whole-page version of that choice.
 */
export function PortfolioShareToggle({
  username,
  initialPublic,
}: {
  username: string;
  initialPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portfolio/${username}`
      : `/portfolio/${username}`;

  function toggle() {
    const next = !isPublic;
    setIsPublic(next); // optimistic
    setError(null);
    startTransition(async () => {
      const r = await setPortfolioPublic(next);
      if (!r.ok) {
        setIsPublic(!next);
        setError(r.error ?? "Couldn't update it.");
      }
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-4 p-3 rounded-cozy border border-wood-200 bg-cream-50 max-w-md">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={toggle}
          disabled={pending}
          className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
        />
        <span className="text-sm font-medium text-wood-800">
          Public share link
        </span>
      </label>
      <p className="text-xs text-wood-500 mt-1 ml-6">
        {isPublic
          ? "Anyone with the link can view your public work — no Stardrop login needed. Good for sharing with colleges or employers."
          : "Off — only classmates and teachers signed into Stardrop can see this page."}
      </p>

      {isPublic && (
        <div className="flex items-center gap-2 mt-2 ml-6">
          <code className="flex-1 min-w-0 truncate text-xs bg-cream-100 border border-wood-200 rounded px-2 py-1 text-wood-700">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="flex-shrink-0 p-1.5 rounded-cozy text-wood-500 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors"
            title="Copy link"
            aria-label="Copy share link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-sage-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-terracotta-700 mt-1.5 ml-6">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
