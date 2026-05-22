"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { loadStarterContent } from "@/app/exam-prep/actions";

/** Teacher-only: loads the Unity-cert starter content into the database. */
export function SeedContentButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const r = await loadStarterContent();
      setDone(
        `Loaded ${r.terms} glossary terms, ${r.questions} questions, and ${r.examples} code examples.`
      );
    } catch {
      setError("Couldn't load the starter content. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-sage-800">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        {done} Refresh to see it.
      </p>
    );
  }

  return (
    <div>
      <Button onClick={handle} disabled={loading}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" strokeWidth={2} />
        )}
        {loading ? "Loading…" : "Load starter content"}
      </Button>
      {error && (
        <p className="text-xs text-terracotta-700 mt-2">{error}</p>
      )}
    </div>
  );
}
