"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GitCommitHorizontal,
  History,
  RotateCcw,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  COMMIT_MESSAGE_MAX,
  validateCommitMessage,
  type CommitSummary,
} from "@/lib/commits";
import {
  commitCode,
  getCommitVersions,
  listCommits,
} from "@/app/student/assignments/commit-actions";
import { CommitList, timeAgo } from "@/components/assignments/CommitList";

export type CommitStatus = {
  commitCount: number;
  hasUncommittedChanges: boolean;
};

interface CommitBarProps {
  submissionId: string | null;
  /** Creates the submission row on first use; returns its id. */
  ensureSubmission: () => Promise<string | null>;
  code: string;
  /** Replace the editor contents (Restore). */
  onRestore: (code: string) => void;
  onStatusChange?: (status: CommitStatus) => void;
}

/**
 * Lightweight, Git-like version history above the code editor:
 * a status line, a Commit button (asks for a message), and a History
 * drawer where any earlier commit can be viewed and restored.
 */
export function CommitBar({
  submissionId,
  ensureSubmission,
  code,
  onRestore,
  onStatusChange,
}: CommitBarProps) {
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [headCode, setHeadCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(submissionId === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [commitOpen, setCommitOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Set after a Restore so the next commit records where it came from.
  const [restoredFrom, setRestoredFrom] = useState<CommitSummary | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<CommitSummary | null>(
    null
  );

  const hasUncommittedChanges =
    headCode === null ? code.trim() !== "" : code !== headCode;

  useEffect(() => {
    onStatusChange?.({ commitCount: commits.length, hasUncommittedChanges });
  }, [commits.length, hasUncommittedChanges, onStatusChange]);

  // Load history once we have a submission.
  const loadedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!submissionId || loadedForRef.current === submissionId) return;
    loadedForRef.current = submissionId;
    listCommits(submissionId).then((r) => {
      if (r.ok) {
        setCommits(r.commits);
        setHeadCode(r.headCode);
      } else {
        setLoadError(r.error);
      }
      setLoaded(true);
    });
  }, [submissionId]);

  /** Commit the current editor code. Returns true on success. */
  const doCommit = useCallback(
    async (message: string): Promise<{ ok: boolean; error?: string }> => {
      const subId = await ensureSubmission();
      if (!subId) return { ok: false, error: "Couldn't create your submission." };
      const r = await commitCode(subId, message, code, restoredFrom?.id ?? null);
      if (!r.ok) return { ok: false, error: r.error };
      setCommits((prev) => [r.commit, ...prev]);
      setHeadCode(code);
      setRestoredFrom(null);
      return { ok: true };
    },
    [code, ensureSubmission, restoredFrom]
  );

  // `currentHead` is passed explicitly after commit-then-restore, where the
  // `headCode` state in this closure is still the pre-commit value.
  async function restore(target: CommitSummary, currentHead = headCode) {
    const r = await getCommitVersions(target.id);
    if (!r.ok) return { ok: false, error: r.error };
    const restoredCode = r.versions.code;
    onRestore(restoredCode);
    setConfirmRestore(null);
    setHistoryOpen(false);
    // Restoring the latest commit just discards changes — nothing new to
    // commit. Restoring an older one: prompt to commit it as a new version.
    if (restoredCode !== currentHead) {
      setRestoredFrom(target);
      setCommitMessage(`Restore "${target.message}"`.slice(0, COMMIT_MESSAGE_MAX));
      setCommitOpen(true);
    }
    return { ok: true };
  }

  const head = commits[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-cozy border border-wood-200 bg-cream-50 px-3 py-2">
        <StatusLine
          loaded={loaded}
          loadError={loadError}
          head={head}
          dirty={hasUncommittedChanges}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="w-4 h-4" strokeWidth={1.75} />
            History{commits.length > 0 ? ` (${commits.length})` : ""}
          </Button>
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setCommitOpen((o) => !o)}
              aria-expanded={commitOpen}
            >
              <GitCommitHorizontal className="w-4 h-4" strokeWidth={2} />
              Commit
            </Button>
            {commitOpen && (
              <CommitPopover
                message={commitMessage}
                setMessage={setCommitMessage}
                dirty={hasUncommittedChanges}
                restoredFrom={restoredFrom}
                onClose={() => setCommitOpen(false)}
                onCommit={async (msg) => {
                  const r = await doCommit(msg);
                  if (r.ok) {
                    setCommitMessage("");
                    setCommitOpen(false);
                  }
                  return r;
                }}
              />
            )}
          </div>
        </div>
      </div>

      {historyOpen && (
        <HistoryDrawer
          commits={commits}
          currentCode={code}
          onClose={() => setHistoryOpen(false)}
          onRestore={setConfirmRestore}
        />
      )}

      {confirmRestore && (
        <RestoreDialog
          target={confirmRestore}
          dirty={hasUncommittedChanges}
          onCancel={() => setConfirmRestore(null)}
          onCommitThenRestore={async (msg) => {
            const c = await doCommit(msg);
            if (!c.ok) return c;
            return restore(confirmRestore, code);
          }}
          onRestore={() => restore(confirmRestore)}
        />
      )}
    </>
  );
}

// =============================================================
// Status line
// =============================================================

function StatusLine({
  loaded,
  loadError,
  head,
  dirty,
}: {
  loaded: boolean;
  loadError: string | null;
  head: CommitSummary | undefined;
  dirty: boolean;
}) {
  if (!loaded) {
    return (
      <span className="flex items-center gap-2 text-sm text-wood-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history…
      </span>
    );
  }
  if (loadError) {
    return (
      <span className="flex items-center gap-2 text-sm text-terracotta-700">
        <AlertCircle className="w-3.5 h-3.5" /> Couldn&apos;t load history
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          dirty ? "bg-honey-500" : "bg-sage-500"
        }`}
        aria-hidden
      />
      <span className={dirty ? "text-wood-800" : "text-sage-800"}>
        {!head
          ? "No commits yet"
          : dirty
            ? "Uncommitted changes"
            : "All changes committed"}
      </span>
      {head && (
        <span className="text-wood-500 truncate">
          · last commit &ldquo;{head.message}&rdquo; {timeAgo(head.createdAt)}
        </span>
      )}
    </div>
  );
}

// =============================================================
// Commit popover
// =============================================================

function CommitPopover({
  message,
  setMessage,
  dirty,
  restoredFrom,
  onClose,
  onCommit,
}: {
  message: string;
  setMessage: (m: string) => void;
  dirty: boolean;
  restoredFrom: CommitSummary | null;
  onClose: () => void;
  onCommit: (msg: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    // Defer so the click that opened us doesn't immediately close us.
    const t = setTimeout(() => window.addEventListener("mousedown", onDown), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateCommitMessage(message);
    if (v) return setError(v);
    setBusy(true);
    setError(null);
    const r = await onCommit(message);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Commit failed");
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-cozy-lg border border-wood-200 bg-cream-50 shadow-cozy-lg p-4"
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label
            htmlFor="commit-message"
            className="block text-sm font-medium text-wood-900 mb-1"
          >
            Message
          </label>
          <Input
            id="commit-message"
            autoFocus
            value={message}
            maxLength={COMMIT_MESSAGE_MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Add jump when Space is pressed"
          />
          <p className="text-xs text-wood-500 mt-1">
            {restoredFrom
              ? "Saves the restored code as a new commit — your history stays intact."
              : "Describe what you changed, so future-you can find it."}
          </p>
        </div>
        {!dirty && (
          <p className="text-xs text-wood-600 bg-cream-100 rounded-cozy px-2 py-1.5">
            No changes since your last commit.
          </p>
        )}
        {error && (
          <p className="flex items-start gap-1.5 text-xs text-terracotta-800">
            <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !dirty}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Commit
          </Button>
        </div>
      </form>
    </div>
  );
}

// =============================================================
// History drawer
// =============================================================

function HistoryDrawer({
  commits,
  currentCode,
  onClose,
  onRestore,
}: {
  commits: CommitSummary[];
  currentCode: string;
  onClose: () => void;
  onRestore: (c: CommitSummary) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-wood-900/30 flex justify-end"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Commit history"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-3xl bg-cream-50 border-l border-wood-200 shadow-cozy-lg flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wood-100">
          <div>
            <h2 className="font-display text-lg text-wood-900">History</h2>
            <p className="text-xs text-wood-500">
              Every commit you&apos;ve made, newest first. Click one to see
              what changed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-cozy text-wood-400 hover:text-wood-700 hover:bg-cream-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <CommitList
            commits={commits}
            fetchVersions={getCommitVersions}
            compareTo={{ code: currentCode, label: "Current code" }}
            emptyText={
              <p className="py-5">
                No commits yet. Click <strong>Commit</strong> to save a named
                version of your code — you can come back to it any time.
              </p>
            }
            renderActions={(c) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(c)}
                title="Load this version into the editor"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                Restore
              </Button>
            )}
          />
        </div>
      </aside>
    </div>
  );
}

// =============================================================
// Restore confirmation
// =============================================================

function RestoreDialog({
  target,
  dirty,
  onCancel,
  onCommitThenRestore,
  onRestore,
}: {
  target: CommitSummary;
  dirty: boolean;
  onCancel: () => void;
  onCommitThenRestore: (msg: string) => Promise<{ ok: boolean; error?: string }>;
  onRestore: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const [message, setMessage] = useState("Work in progress before restoring");
  const [busy, setBusy] = useState<null | "commit" | "discard">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function run(kind: "commit" | "discard") {
    if (kind === "commit") {
      const v = validateCommitMessage(message);
      if (v) return setError(v);
    }
    setBusy(kind);
    setError(null);
    const r = kind === "commit" ? await onCommitThenRestore(message) : await onRestore();
    setBusy(null);
    if (!r.ok) setError(r.error ?? "Restore failed");
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-wood-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-cozy-lg shadow-cozy-lg border border-wood-100 w-full max-w-md p-5 space-y-4"
      >
        <div>
          <h2 id="restore-title" className="font-display text-lg text-wood-900">
            Restore &ldquo;{target.message}&rdquo;?
          </h2>
          <p className="text-sm text-wood-600 mt-1">
            {dirty
              ? "You have uncommitted changes. Restoring replaces the code in your editor — commit your changes first so you don't lose them."
              : "This replaces the code in your editor with this version. Your history stays — you can always restore your latest commit again."}
          </p>
        </div>

        {dirty && (
          <div>
            <label
              htmlFor="restore-commit-message"
              className="block text-sm font-medium text-wood-900 mb-1"
            >
              Message for your current work
            </label>
            <Input
              id="restore-commit-message"
              value={message}
              maxLength={COMMIT_MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-terracotta-800">
            <AlertCircle className="w-4 h-4 mt-px flex-shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy !== null}>
            Cancel
          </Button>
          {dirty ? (
            <>
              <Button
                variant="secondary"
                onClick={() => run("discard")}
                disabled={busy !== null}
              >
                {busy === "discard" && <Loader2 className="w-4 h-4 animate-spin" />}
                Discard changes &amp; restore
              </Button>
              <Button onClick={() => run("commit")} disabled={busy !== null}>
                {busy === "commit" && <Loader2 className="w-4 h-4 animate-spin" />}
                Commit, then restore
              </Button>
            </>
          ) : (
            <Button onClick={() => run("discard")} disabled={busy !== null}>
              {busy === "discard" && <Loader2 className="w-4 h-4 animate-spin" />}
              Restore
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
