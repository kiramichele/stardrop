"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteGist } from "@/app/starhub/actions";

/** Small inline-confirm delete for a portfolio gist. */
export function GistDeleteButton({ gistId }: { gistId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    start(async () => {
      const result = await deleteGist(gistId);
      if (!result.ok) {
        setError(result.error ?? "Couldn't delete.");
      } else {
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-xs text-wood-400 hover:text-terracotta-700 transition-colors"
        aria-label="Delete gist"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {error && <span className="text-xs text-terracotta-800">{error}</span>}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-xs font-medium text-terracotta-700 hover:text-terracotta-800 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-xs text-wood-500 hover:text-wood-700"
      >
        Cancel
      </button>
    </span>
  );
}
