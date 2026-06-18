"use client";

import { useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Loader2,
  Link as LinkIcon,
  Check,
  Trash2,
  GitFork,
  FileCode2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  saveProgram,
  updateProgram,
  deleteProgram,
  forkProgram,
} from "@/app/playground/actions";
import {
  PLAYGROUND_LANGUAGES,
  CSHARP_CONSOLE_STARTER,
  CSHARP_UNITY_STARTER,
  type PlaygroundProgram,
} from "@/lib/playground";
import { CodeRunner } from "./CodeRunner";

const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[480px] bg-cream-50 text-wood-500 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading editor…</span>
      </div>
    ),
  }
);

const MONACO_LANG: Record<string, string> = {
  csharp: "csharp",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  html: "html",
  css: "css",
  json: "json",
  plaintext: "plaintext",
};

// Default new-program template: Unity, since this is a Unity class.
// The "New" button below offers Console / Unity / Blank explicitly.
const DEFAULT_STARTER = CSHARP_UNITY_STARTER;

type NewTemplate = "unity" | "console" | "blank";

function templateCode(kind: NewTemplate): string {
  switch (kind) {
    case "console":
      return CSHARP_CONSOLE_STARTER;
    case "unity":
      return CSHARP_UNITY_STARTER;
    case "blank":
    default:
      return "";
  }
}

export function PlaygroundClient({
  savedPrograms,
  initialProgram,
  currentUserId,
}: {
  savedPrograms: PlaygroundProgram[];
  initialProgram: PlaygroundProgram | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const codeRef = useRef<string>(initialProgram?.code ?? DEFAULT_STARTER);

  const [title, setTitle] = useState(initialProgram?.title ?? "");
  const [language, setLanguage] = useState(
    initialProgram?.language ?? "csharp"
  );
  // Stored separately so the Save button reflects edits even before
  // Monaco emits an onChange (controlled value would also trigger
  // editor reflow per keystroke — uncontrolled is smoother for Monaco).
  const [loadedProgram, setLoadedProgram] = useState<PlaygroundProgram | null>(
    initialProgram
  );
  const isOwnedByMe = loadedProgram
    ? loadedProgram.user_id === currentUserId
    : true; // fresh editor = "mine"

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [deleteBusy, startDelete] = useTransition();

  function onCodeChange(value: string | undefined) {
    codeRef.current = value ?? "";
  }

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  function newFrom(template: NewTemplate) {
    if (!confirm("Start a new program? Unsaved changes will be lost.")) return;
    codeRef.current = templateCode(template);
    setTitle("");
    setLanguage("csharp");
    setLoadedProgram(null);
    setError(null);
    setShareCopied(false);
    setShowTemplatePicker(false);
    router.push("/playground");
  }

  function save() {
    setError(null);
    if (loadedProgram && isOwnedByMe) {
      // Update in place.
      start(async () => {
        const result = await updateProgram(loadedProgram.id, {
          title: title.trim() || loadedProgram.title,
          language,
          code: codeRef.current,
        });
        if (!result.ok) {
          setError(result.error ?? "Couldn't save.");
        } else {
          // Update local state so re-saves work.
          setLoadedProgram({
            ...loadedProgram,
            title: title.trim() || loadedProgram.title,
            language,
            code: codeRef.current,
          });
        }
      });
      return;
    }
    // New program — need a title.
    if (!title.trim()) {
      setShowSaveForm(true);
      return;
    }
    start(async () => {
      const result = await saveProgram({
        title: title.trim(),
        language,
        code: codeRef.current,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/playground/${result.id}`);
    });
  }

  function saveAsNew() {
    setShowSaveForm(true);
  }

  function submitSaveForm(formTitle: string) {
    const trimmed = formTitle.trim();
    if (!trimmed) return;
    setShowSaveForm(false);
    start(async () => {
      const result = await saveProgram({
        title: trimmed,
        language,
        code: codeRef.current,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/playground/${result.id}`);
    });
  }

  function fork() {
    if (!loadedProgram) return;
    start(async () => {
      const result = await forkProgram(loadedProgram.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/playground/${result.id}`);
    });
  }

  function remove() {
    if (!loadedProgram || !isOwnedByMe) return;
    if (!confirm(`Delete "${loadedProgram.title}"? This can't be undone.`))
      return;
    startDelete(async () => {
      const result = await deleteProgram(loadedProgram.id);
      if (!result.ok) {
        setError(result.error ?? "Couldn't delete.");
        return;
      }
      router.push("/playground");
    });
  }

  function copyShareLink() {
    if (!loadedProgram) return;
    const url = `${window.location.origin}/playground/${loadedProgram.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1800);
      })
      .catch(() => {
        setError("Couldn't copy the link — copy from the address bar instead.");
      });
  }

  return (
    <div className="space-y-5">
      {/* Saved programs strip */}
      {savedPrograms.length > 0 && (
        <Card padded={false} className="p-3">
          <p className="label-eyebrow mb-2">Your saved programs</p>
          <div className="flex flex-wrap gap-2">
            {savedPrograms.map((p) => {
              const isActive = loadedProgram?.id === p.id;
              return (
                <Link
                  key={p.id}
                  href={`/playground/${p.id}`}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-cozy border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-terracotta-300 bg-terracotta-100 text-terracotta-800 font-medium"
                      : "border-wood-200 bg-cream-50 text-wood-700 hover:border-terracotta-300 hover:text-terracotta-700",
                  ].join(" ")}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[180px]">{p.title}</span>
                  <span className="text-[0.65rem] text-wood-400 uppercase tracking-wide-label">
                    {p.language}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Editor + controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              loadedProgram ? loadedProgram.title : "Untitled program"
            }
            maxLength={120}
            className="flex-1 min-w-[200px]"
            aria-label="Program title"
          />
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language"
            className="w-auto"
          >
            {PLAYGROUND_LANGUAGES.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="rounded-cozy border border-wood-200 overflow-hidden">
          <Editor
            height="440px"
            language={MONACO_LANG[language] ?? "plaintext"}
            defaultValue={codeRef.current}
            onChange={onCodeChange}
            theme="vs"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
            }}
            key={loadedProgram?.id ?? "blank"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button onClick={save} disabled={busy || deleteBusy}>
            <Save className="w-4 h-4" strokeWidth={2} />
            {busy
              ? "Saving…"
              : loadedProgram && isOwnedByMe
                ? "Save changes"
                : "Save"}
          </Button>

          {loadedProgram && (
            <>
              {!isOwnedByMe && (
                <Button
                  variant="secondary"
                  onClick={fork}
                  disabled={busy || deleteBusy}
                >
                  <GitFork className="w-4 h-4" strokeWidth={2} />
                  Save a copy
                </Button>
              )}
              {isOwnedByMe && (
                <Button
                  variant="ghost"
                  onClick={saveAsNew}
                  disabled={busy || deleteBusy}
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Save as new
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={copyShareLink}
                disabled={busy || deleteBusy}
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 text-sage-700" />
                    Link copied
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Copy share link
                  </>
                )}
              </Button>
            </>
          )}

          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowTemplatePicker((v) => !v)}
              disabled={busy || deleteBusy}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New
            </Button>
            {showTemplatePicker && (
              <div
                className="absolute left-0 top-full z-20 mt-1 w-56 rounded-cozy border border-wood-200 bg-cream-50 p-1 shadow-cozy-lg"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => newFrom("unity")}
                  className="block w-full rounded-[0.4rem] px-3 py-2 text-left text-sm hover:bg-cream-100"
                >
                  <span className="block font-medium text-wood-900">
                    Unity script
                  </span>
                  <span className="block text-xs text-wood-500">
                    MonoBehaviour with Start + Update
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => newFrom("console")}
                  className="block w-full rounded-[0.4rem] px-3 py-2 text-left text-sm hover:bg-cream-100"
                >
                  <span className="block font-medium text-wood-900">
                    Plain C# console
                  </span>
                  <span className="block text-xs text-wood-500">
                    class Program with Main()
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => newFrom("blank")}
                  className="block w-full rounded-[0.4rem] px-3 py-2 text-left text-sm hover:bg-cream-100"
                >
                  <span className="block font-medium text-wood-900">
                    Blank
                  </span>
                  <span className="block text-xs text-wood-500">
                    Empty editor
                  </span>
                </button>
              </div>
            )}
          </div>

          {loadedProgram && isOwnedByMe && (
            <Button
              variant="danger"
              size="sm"
              onClick={remove}
              disabled={busy || deleteBusy}
              className="ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
            {error}
          </p>
        )}

        {showSaveForm && (
          <SaveAsForm
            initialTitle={title}
            onCancel={() => setShowSaveForm(false)}
            onSave={submitSaveForm}
            disabled={busy}
          />
        )}
      </Card>

      {/* Run buttons + output */}
      <Card>
        <h3 className="font-display text-lg text-wood-900 mb-3">Run it</h3>
        <CodeRunner
          getCode={() => codeRef.current}
          mode="both"
          language={language}
        />
      </Card>
    </div>
  );
}

function SaveAsForm({
  initialTitle,
  onCancel,
  onSave,
  disabled,
}: {
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(initialTitle);
  return (
    <div className="mt-3 p-3 rounded-cozy border border-wood-200 bg-cream-50">
      <Label htmlFor="save-as-title">Save program as</Label>
      <div className="flex gap-2">
        <Input
          id="save-as-title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hello world experiment"
          maxLength={120}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSave(name);
          }}
        />
        <Button
          size="sm"
          onClick={() => onSave(name)}
          disabled={disabled || !name.trim()}
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
