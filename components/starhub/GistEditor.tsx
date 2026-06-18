"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Textarea,
  Select,
  FieldHint,
  FieldError,
} from "@/components/ui/Input";
import { GIST_LANGUAGES } from "@/lib/starhub";
import type { PlaygroundProgram } from "@/lib/playground";
import {
  createGist,
  updateGist,
  deleteGist,
} from "@/app/starhub/actions";

// Monaco — same lazy-load pattern as CodeEditor. We use it directly
// here so the language prop is dynamic (csharp / javascript / etc.).
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[360px] bg-cream-50 text-wood-500 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading editor…</span>
      </div>
    ),
  }
);

// Monaco language IDs that match our stored language keys.
const MONACO_LANG: Record<string, string> = {
  csharp: "csharp",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  html: "html",
  css: "css",
  json: "json",
  shader: "hlsl",
  plaintext: "plaintext",
};

export type GistEditorMode =
  | { mode: "create"; username: string }
  | { mode: "edit"; gistId: string; username: string };

export function GistEditor({
  initialTitle = "",
  initialDescription = "",
  initialLanguage = "csharp",
  initialCode = "",
  initialIsPublic = false,
  context,
  savedPrograms = [],
}: {
  initialTitle?: string;
  initialDescription?: string;
  initialLanguage?: string;
  initialCode?: string;
  initialIsPublic?: boolean;
  context: GistEditorMode;
  /** When creating a new gist, lets the student start from a Playground program. */
  savedPrograms?: PlaygroundProgram[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [deletePending, deleteStart] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      if (context.mode === "create") {
        const result = await createGist({
          title,
          description,
          language,
          code,
          isPublic,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/starhub/${context.username}`);
      } else {
        const result = await updateGist(context.gistId, {
          title,
          description,
          language,
          code,
        });
        if (!result.ok) {
          setError(result.error ?? "Couldn't save.");
          return;
        }
        router.push(`/starhub/${context.username}`);
      }
    });
  }

  function remove() {
    if (context.mode !== "edit") return;
    if (!confirm("Delete this gist? This can't be undone.")) return;
    deleteStart(async () => {
      const result = await deleteGist(context.gistId);
      if (!result.ok) {
        setError(result.error ?? "Couldn't delete.");
        return;
      }
      router.push(`/starhub/${context.username}`);
    });
  }

  function loadFromProgram(programId: string) {
    const program = savedPrograms.find((p) => p.id === programId);
    if (!program) return;
    setTitle(program.title);
    setLanguage(program.language);
    setCode(program.code);
  }

  return (
    <Card className="max-w-3xl">
      <div className="space-y-4">
        {context.mode === "create" && savedPrograms.length > 0 && (
          <div>
            <Label htmlFor="gist-from-program">
              Start from a saved program{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Select
              id="gist-from-program"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) loadFromProgram(e.target.value);
              }}
              disabled={pending || deletePending}
            >
              <option value="">— Start from scratch —</option>
              {savedPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.language})
                </option>
              ))}
            </Select>
            <FieldHint>
              Pulls in the title, language, and code from one of your
              Playground programs. You can edit before posting.
            </FieldHint>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gist-title">Title</Label>
            <Input
              id="gist-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Player movement controller"
              maxLength={120}
              disabled={pending || deletePending}
            />
          </div>
          <div>
            <Label htmlFor="gist-language">Language</Label>
            <Select
              id="gist-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={pending || deletePending}
            >
              {GIST_LANGUAGES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="gist-description">
            Caption{" "}
            <span className="text-wood-500 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="gist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this code do? Why did you write it?"
            rows={2}
            maxLength={600}
            disabled={pending || deletePending}
          />
        </div>

        <div>
          <Label>Code</Label>
          <div className="rounded-cozy border border-wood-200 overflow-hidden">
            <Editor
              height="360px"
              language={MONACO_LANG[language] ?? "plaintext"}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme="vs"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: pending || deletePending,
                wordWrap: "on",
              }}
            />
          </div>
        </div>

        {context.mode === "create" && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={pending}
              className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
            />
            <span>
              <span className="block text-sm font-medium text-wood-900">
                Publish on my StarHub now
              </span>
              <span className="block text-xs text-wood-500">
                Visible to classmates and your teacher. You can flip this
                any time from the entry.
              </span>
            </span>
          </label>
        )}

        {error && <FieldError>{error}</FieldError>}
        {!isPublic && context.mode === "create" && (
          <FieldHint>
            Saved as private — only you and your teacher can see it until
            you publish.
          </FieldHint>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={pending || deletePending}>
            <Save className="w-4 h-4" strokeWidth={2} />
            {pending
              ? "Saving…"
              : context.mode === "create"
                ? "Save gist"
                : "Save changes"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(`/starhub/${context.username}`)}
            disabled={pending || deletePending}
          >
            Cancel
          </Button>
          {context.mode === "edit" && (
            <Button
              variant="danger"
              size="sm"
              onClick={remove}
              disabled={pending || deletePending}
              className="ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
