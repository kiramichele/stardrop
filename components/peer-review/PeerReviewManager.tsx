"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Shuffle,
  UserPlus,
  Users,
  Check,
  Clock,
  Link2Off,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import type { PeerReviewRow, PeerStudent } from "@/lib/peer-review";
import {
  randomizePairs,
  autoAssignUnpaired,
  setManualPair,
  unpairStudent,
} from "@/app/peer-review/actions";

interface Props {
  assignmentId: string;
  sourceTitle: string | null;
  students: PeerStudent[];
  matchups: PeerReviewRow[];
  sourceSubmitters: string[];
}

export function PeerReviewManager({
  assignmentId,
  sourceTitle,
  students,
  matchups,
  sourceSubmitters,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of students) m.set(s.id, `${s.firstName} ${s.lastName}`);
    return m;
  }, [students]);
  const submitters = useMemo(() => new Set(sourceSubmitters), [sourceSubmitters]);

  const reviewers = useMemo(
    () => new Set(matchups.map((m) => m.reviewer_id)),
    [matchups]
  );
  const reviewees = useMemo(
    () => new Set(matchups.map((m) => m.reviewee_id)),
    [matchups]
  );
  const unpaired = useMemo(
    () => students.filter((s) => !reviewers.has(s.id) && !reviewees.has(s.id)),
    [students, reviewers, reviewees]
  );
  const submittedCount = matchups.filter((m) => m.submitted_at).length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setMessage(null);
    startTransition(async () => {
      const r = await fn();
      setIsError(!r.ok);
      setMessage(r.ok ? okMsg : r.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-4">
      <Card className="bg-cream-100/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base text-wood-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-wood-500" strokeWidth={1.75} />
              Peer review pairing
            </h3>
            <p className="text-xs text-wood-500 mt-0.5">
              Reviewing{" "}
              <span className="font-medium text-wood-700">
                {sourceTitle ?? "— no source assignment —"}
              </span>{" "}
              · double-blind (students never see names).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() =>
                run(() => randomizePairs(assignmentId), "Pairs shuffled.")
              }
            >
              <Shuffle className="w-3.5 h-3.5" strokeWidth={2} />
              Randomize pairs
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending || unpaired.length === 0}
              onClick={() =>
                run(
                  () => autoAssignUnpaired(assignmentId),
                  "Unpaired students assigned."
                )
              }
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
              Auto-assign unpaired ({unpaired.length})
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-xs text-wood-600">
          <span>{students.length} students</span>
          <span>{reviewers.size} paired</span>
          <span>{unpaired.length} unpaired</span>
          <span className="text-sage-700">{submittedCount} feedback submitted</span>
        </div>

        {message && (
          <p
            className={[
              "text-xs mt-3 px-2.5 py-1.5 rounded-cozy border",
              isError
                ? "bg-terracotta-50 text-terracotta-800 border-terracotta-200"
                : "bg-sage-50 text-sage-800 border-sage-200",
            ].join(" ")}
          >
            {message}
          </p>
        )}
      </Card>

      {/* Manual pairing from the unpaired pool */}
      {unpaired.length >= 2 && (
        <Card>
          <p className="text-sm font-medium text-wood-800 mb-2">
            Pair two students by hand
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={pairA}
              onChange={(e) => setPairA(e.target.value)}
              className="w-44"
              aria-label="First student"
            >
              <option value="">Student…</option>
              {unpaired.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === pairB}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
            <span className="text-wood-400 text-sm pb-2">+</span>
            <Select
              value={pairB}
              onChange={(e) => setPairB(e.target.value)}
              className="w-44"
              aria-label="Second student"
            >
              <option value="">Student…</option>
              {unpaired.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === pairA}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              disabled={isPending || !pairA || !pairB}
              onClick={() =>
                run(async () => {
                  const r = await setManualPair(assignmentId, pairA, pairB);
                  if (r.ok) {
                    setPairA("");
                    setPairB("");
                  }
                  return r;
                }, "Paired.")
              }
            >
              Pair
            </Button>
          </div>
        </Card>
      )}

      {/* Matchups + moderation */}
      <Card padded={false} className="overflow-hidden">
        {matchups.length === 0 ? (
          <p className="text-sm text-wood-500 text-center py-6">
            No pairs yet — hit <strong>Randomize pairs</strong> to get started.
          </p>
        ) : (
          <ul className="divide-y divide-wood-100">
            {matchups
              .slice()
              .sort((a, b) =>
                (nameById.get(a.reviewer_id) ?? "").localeCompare(
                  nameById.get(b.reviewer_id) ?? ""
                )
              )
              .map((m) => {
                const done = !!m.submitted_at;
                const isOpen = expanded === m.id;
                const revieweeHasWork = submitters.has(m.reviewee_id);
                return (
                  <li key={m.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-wood-900">
                          {nameById.get(m.reviewer_id) ?? "Student"}
                        </span>
                        <span className="text-wood-400"> reviews </span>
                        <span className="font-medium text-wood-900">
                          {nameById.get(m.reviewee_id) ?? "Student"}
                        </span>
                        {!revieweeHasWork && (
                          <span className="ml-2 text-[0.65rem] font-semibold text-honey-800 bg-honey-100 border border-honey-200 rounded px-1.5 py-0.5">
                            no work to review
                          </span>
                        )}
                      </div>
                      {done ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-sage-700 font-medium">
                          <Check className="w-3.5 h-3.5" strokeWidth={2} />
                          submitted
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-wood-400">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                          pending
                        </span>
                      )}
                      {done && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : m.id)}
                          className="flex-shrink-0 p-1 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-cream-200 transition-colors"
                          aria-label="Read feedback"
                        >
                          <ChevronDown
                            className={[
                              "w-4 h-4 transition-transform",
                              isOpen ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </button>
                      )}
                      {!done && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            run(
                              () => unpairStudent(assignmentId, m.reviewer_id),
                              "Unpaired."
                            )
                          }
                          className="flex-shrink-0 p-1 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors disabled:opacity-50"
                          title="Unpair"
                          aria-label="Unpair"
                        >
                          <Link2Off className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                    {isOpen && done && (
                      <p className="mt-2 text-sm text-wood-700 whitespace-pre-wrap bg-cream-100 rounded-cozy p-3 border border-wood-100">
                        {m.body}
                      </p>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </Card>
    </div>
  );
}
