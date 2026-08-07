"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { requestRevision } from "@/app/teacher/assignments/actions";

/**
 * Lets a teacher explicitly flag a submission for revision — students can
 * already resubmit any time, this just pings them with a notification
 * (and email, if they have that on) asking them to. Clears itself the
 * next time the student turns in a revision.
 */
export function RequestRevisionButton({
  submissionId,
  initialRequestedAt,
}: {
  submissionId: string;
  initialRequestedAt: string | null;
}) {
  const router = useRouter();
  const [requestedAt, setRequestedAt] = useState(initialRequestedAt);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await requestRevision(submissionId);
        setRequestedAt(new Date().toISOString());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send it.");
      }
    });
  }

  if (requestedAt) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-honey-700">
        <Check className="w-3.5 h-3.5" />
        Revision requested {new Date(requestedAt).toLocaleDateString()}
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={pending}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4" strokeWidth={2} />
        {pending ? "Sending…" : "Request a revision"}
      </Button>
      {error && (
        <p className="text-xs text-terracotta-800 mt-1.5">{error}</p>
      )}
    </div>
  );
}
