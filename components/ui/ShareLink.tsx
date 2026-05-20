"use client";

import { useEffect, useState } from "react";
import { Link2, Copy, Check, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ShareLinkProps {
  /** App-relative path, e.g. "/lessons/abc" or "/assignments/abc". */
  path: string;
  title?: string;
  description: string;
  /** Amber caveat shown under the field; null/undefined = no caveat. */
  warning?: string | null;
}

/** A copy-the-URL card for sharing a page (e.g. pasting into Canvas). */
export function ShareLink({
  path,
  title = "Share link",
  description,
  warning,
}: ShareLinkProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the field is selectable as a fallback
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-terracotta-600" strokeWidth={2} />
        <h3 className="font-display text-lg text-wood-900">{title}</h3>
      </div>
      <p className="text-xs text-wood-600 mb-3">{description}</p>

      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-cozy border border-wood-200 bg-cream-50 px-2.5 py-1.5 text-sm text-wood-700 focus:outline-none focus:ring-2 focus:ring-terracotta-300"
        />
        <Button
          onClick={copy}
          size="sm"
          variant="secondary"
          className="flex-shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-sage-600" strokeWidth={2.25} />
          ) : (
            <Copy className="w-4 h-4" strokeWidth={2} />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {warning && (
        <p className="flex items-center gap-1.5 text-xs text-honey-800 bg-honey-50 border border-honey-200 rounded-cozy px-2.5 py-1.5 mt-3">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {warning}
        </p>
      )}
    </Card>
  );
}
