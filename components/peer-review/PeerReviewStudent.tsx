"use client";

import { useState, useTransition } from "react";
import { Lock, Check, Clock, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { wordCount } from "@/lib/peer-review";
import { submitPeerFeedback } from "@/app/peer-review/actions";

type Reviewee =
  | { paired: true; hasSubmission: boolean; content: string | null; sourceTitle: string | null }
  | { paired: false };

type Received =
  | { state: "none" }
  | { state: "locked" }
  | { state: "waiting" }
  | { state: "unlocked"; body: string };

interface Props {
  assignmentId: string;
  minimumWords: number;
  reviewee: Reviewee;
  myFeedback: { body: string | null; submittedAt: string | null };
  received: Received;
}

export function PeerReviewStudent({
  assignmentId,
  minimumWords,
  reviewee,
  myFeedback,
  received,
}: Props) {
  const [text, setText] = useState(myFeedback.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const alreadySubmitted = !!myFeedback.submittedAt;
  const words = wordCount(text);
  const meetsMin = words >= minimumWords;

  if (!reviewee.paired) {
    return (
      <Card>
        <p className="text-sm text-wood-600 text-center py-6">
          Your teacher hasn&apos;t assigned review partners yet. Check back
          soon — you&apos;ll see the work to review here.
        </p>
      </Card>
    );
  }

  function submit() {
    setError(null);
    if (!meetsMin) {
      setError(`Please write at least ${minimumWords} words.`);
      return;
    }
    startTransition(async () => {
      const r = await submitPeerFeedback(assignmentId, text);
      if (!r.ok) setError(r.error ?? "Couldn't submit your feedback.");
    });
  }

  return (
    <div className="space-y-4">
      {/* The work being reviewed — double-blind, no author shown. */}
      <Card>
        <p className="label-eyebrow mb-2 inline-flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
          The work you&apos;re reviewing
          <span className="normal-case tracking-normal font-normal text-wood-400">
            · anonymous
          </span>
        </p>
        {reviewee.hasSubmission && reviewee.content ? (
          <pre className="text-xs leading-relaxed bg-wood-900 text-cream-100 rounded-cozy p-3 overflow-x-auto max-h-[420px] whitespace-pre font-mono">
            {reviewee.content}
          </pre>
        ) : (
          <p className="text-sm text-wood-500 italic py-4 text-center">
            Your assigned classmate hasn&apos;t submitted their{" "}
            {reviewee.sourceTitle ?? "work"} yet. Check back, or let your
            teacher know so they can reassign you.
          </p>
        )}
      </Card>

      {/* Your feedback */}
      <Card>
        <p className="label-eyebrow mb-2 inline-flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
          Your feedback
        </p>

        {alreadySubmitted ? (
          <>
            <div className="inline-flex items-center gap-1.5 text-sm text-sage-700 font-medium mb-2">
              <Check className="w-4 h-4" strokeWidth={2} />
              Submitted — thanks for the thoughtful feedback!
            </div>
            <p className="text-sm text-wood-700 whitespace-pre-wrap bg-cream-100 rounded-cozy p-3 border border-wood-100">
              {myFeedback.body}
            </p>
          </>
        ) : (
          <>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What works well? What could be improved? Be specific and kind — point to lines or ideas."
              disabled={isPending || !reviewee.hasSubmission}
            />
            <div className="flex items-center justify-between gap-3 mt-2">
              <p
                className={[
                  "text-xs tabular-nums",
                  minimumWords > 0 && !meetsMin
                    ? "text-wood-400"
                    : "text-sage-700",
                ].join(" ")}
              >
                {words} word{words === 1 ? "" : "s"}
                {minimumWords > 0 ? ` / ${minimumWords} minimum` : ""}
              </p>
              <Button
                size="sm"
                onClick={submit}
                disabled={isPending || !reviewee.hasSubmission || !meetsMin}
              >
                Submit feedback
              </Button>
            </div>
            <p className="text-xs text-wood-500 mt-2">
              Once you submit, your feedback locks and you&apos;ll be able to
              read the feedback written about your work.
            </p>
            {error && (
              <p className="text-xs text-terracotta-700 mt-2">{error}</p>
            )}
          </>
        )}
      </Card>

      {/* Feedback you received — gated behind giving yours first. */}
      <Card>
        <p className="label-eyebrow mb-2">Feedback on your work</p>
        {received.state === "none" && (
          <p className="text-sm text-wood-500 italic py-2">
            No one is assigned to review your work yet.
          </p>
        )}
        {received.state === "locked" && (
          <div className="flex items-center gap-2.5 text-sm text-wood-500 py-2">
            <Lock className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            Give your feedback first to unlock what your reviewer wrote about
            your work.
          </div>
        )}
        {received.state === "waiting" && (
          <div className="flex items-center gap-2.5 text-sm text-wood-500 py-2">
            <Clock className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            You&apos;re all set — your reviewer hasn&apos;t submitted yet. Check
            back soon.
          </div>
        )}
        {received.state === "unlocked" && (
          <p className="text-sm text-wood-700 whitespace-pre-wrap bg-sage-50 border border-sage-200 rounded-cozy p-3">
            {received.body}
          </p>
        )}
      </Card>
    </div>
  );
}
