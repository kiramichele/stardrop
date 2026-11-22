"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { CommitSummary } from "@/lib/commits";
import { CommitList, formatWhen } from "@/components/assignments/CommitList";
import { getCommitVersionsForTeacher } from "@/app/teacher/assignments/commit-actions";

const INITIAL_VISIBLE = 10;

interface TeacherCommitHistoryProps {
  commits: CommitSummary[];
  headCode: string | null;
  submittedCode: string;
}

/** Read-only view of a student's commit history on the grading page. */
export function TeacherCommitHistory({
  commits,
  headCode,
  submittedCode,
}: TeacherCommitHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const first = commits[commits.length - 1];
  const last = commits[0];
  const matchesHead = headCode !== null && headCode === submittedCode;

  return (
    <div className="space-y-3">
      {commits.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-wood-700">
            <strong>{commits.length}</strong>{" "}
            {commits.length === 1 ? "commit" : "commits"}
            {first && last && commits.length > 1 && (
              <span className="text-wood-500" suppressHydrationWarning>
                {" "}
                · {formatWhen(first.createdAt)} → {formatWhen(last.createdAt)}
              </span>
            )}
          </p>
          {matchesHead ? (
            <p className="flex items-center gap-1.5 text-xs text-sage-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              The submission matches the latest commit.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-honey-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              The submission has changes made after the latest commit.
            </p>
          )}
        </div>
      )}

      <CommitList
        commits={commits}
        limit={showAll ? undefined : INITIAL_VISIBLE}
        fetchVersions={getCommitVersionsForTeacher}
        compareTo={{ code: submittedCode, label: "Submission" }}
        diffHeight="420px"
        emptyText={
          <p className="italic">
            No commits — the student never saved a named version.
          </p>
        }
      />

      {commits.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-xs text-terracotta-700 hover:text-terracotta-800 underline"
        >
          {showAll
            ? "Show fewer"
            : `Show all ${commits.length} commits`}
        </button>
      )}
    </div>
  );
}
