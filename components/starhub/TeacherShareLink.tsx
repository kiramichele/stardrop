"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";

/**
 * Teacher-only, read-only counterpart to PortfolioShareToggle: surfaces a
 * student's public share link (when they've opted in) so a teacher can
 * copy it and pass it along to a colleague — without being able to turn
 * the toggle on or off themselves. That consent stays the student's.
 */
export function TeacherShareLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portfolio/${username}`
      : `/portfolio/${username}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-4 max-w-md rounded-cozy border border-wood-200 bg-cream-50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-wood-800">
        <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
        Public share link
      </p>
      <p className="mt-1 text-xs text-wood-500">
        This student has opted in to a public link — copy it to share their
        work with another teacher or colleague.
      </p>
      <div className="mt-2 flex items-center gap-2">
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
    </div>
  );
}
