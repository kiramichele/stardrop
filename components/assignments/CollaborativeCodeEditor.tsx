"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { MonacoBinding } from "y-monaco";
import { Send, Check, Lock, AlertCircle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CodeRunner } from "@/components/playground/CodeRunner";
import { resolveRunAs, type CodeRunMode } from "@/lib/playground";
import { setupMonaco } from "@/lib/monaco/setup";
import { createClient } from "@/lib/supabase/client";
import { SupabaseYjsProvider } from "@/lib/collab/supabase-provider";
import {
  saveGroupDocument,
  submitGroup,
} from "@/app/student/assignments/collab-actions";

const Editor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false }
);

const PALETTE = [
  "#e07a5f",
  "#3d9970",
  "#6b8fd6",
  "#c98bb9",
  "#e6a417",
  "#4fb0a5",
  "#d1495b",
  "#8367c7",
];

export function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const AUTOSAVE_MS = 1500;

interface CollaborativeCodeEditorProps {
  groupId: string;
  initialState: string; // base64 Yjs state
  me: { id: string; name: string };
  isLeader: boolean;
  leaderSubmitsOnly: boolean;
  submitted: boolean;
  graded: boolean;
  codeRunMode: CodeRunMode;
  unitySimulationEnabled: boolean;
}

type Peer = { name: string; color: string };

export function CollaborativeCodeEditor({
  groupId,
  initialState,
  me,
  isLeader,
  leaderSubmitsOnly,
  submitted,
  graded,
  codeRunMode,
  unitySimulationEnabled,
}: CollaborativeCodeEditorProps) {
  const docRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "graded">(
    graded ? "graded" : submitted ? "submitted" : "idle"
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !leaderSubmitsOnly || isLeader;

  // Rebuild the per-peer cursor colors/labels whenever awareness changes.
  function refreshPeerStyles(awareness: Awareness) {
    const rules: string[] = [];
    const list: Peer[] = [];
    awareness.getStates().forEach((state, clientId) => {
      const user = (state as { user?: Peer }).user;
      if (!user) return;
      list.push(user);
      if (clientId === docRef.current?.clientID) return; // don't style self
      const c = user.color;
      const safe = String(user.name).replace(/["\\]/g, "");
      rules.push(`
        .yRemoteSelection-${clientId} { background-color: ${c}44; }
        .yRemoteSelectionHead-${clientId} {
          position: relative; border-left: 2px solid ${c};
          box-sizing: border-box;
        }
        .yRemoteSelectionHead-${clientId}::after {
          content: "${safe}";
          position: absolute; top: -1.4em; left: -2px; white-space: nowrap;
          background: ${c}; color: #fff; font-size: 11px; line-height: 1.3;
          padding: 0 4px; border-radius: 3px; opacity: 0;
          transition: opacity .1s; pointer-events: none; z-index: 20;
        }
        .yRemoteSelectionHead-${clientId}:hover::after { opacity: 1; }
      `);
    });
    if (styleRef.current) styleRef.current.textContent = rules.join("\n");
    // De-dup peers by name+color for the header.
    const seen = new Set<string>();
    setPeers(
      list.filter((p) => {
        const k = `${p.name}|${p.color}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
    );
  }

  const handleMount: OnMount = (editorInstance, monaco) => {
    if (docRef.current) return; // guard against double-mount
    setupMonaco(monaco);
    monaco.editor.setTheme("stardrop-cozy");

    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, fromB64(initialState));
    } catch {
      /* start empty if the seed is bad */
    }
    const ytext = doc.getText("code");
    const awareness = new Awareness(doc);
    awareness.setLocalStateField("user", {
      name: me.name,
      color: colorFromId(me.id),
    });

    const style = document.createElement("style");
    document.head.appendChild(style);
    styleRef.current = style;

    const provider = new SupabaseYjsProvider(
      createClient(),
      `group:${groupId}`,
      doc,
      awareness
    );
    const model = editorInstance.getModel();
    const binding = model
      ? new MonacoBinding(ytext, model, new Set([editorInstance]), awareness)
      : null;

    docRef.current = doc;
    ytextRef.current = ytext;
    awarenessRef.current = awareness;
    providerRef.current = provider;
    bindingRef.current = binding;

    awareness.on("change", () => refreshPeerStyles(awareness));
    refreshPeerStyles(awareness);

    // Debounced autosave of the shared doc — keeps saving even after
    // grading, since the group can still turn in a revision.
    doc.on("update", () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveState("saving");
        const state = toB64(Y.encodeStateAsUpdate(doc));
        saveGroupDocument(groupId, state, ytext.toString()).then(() => {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1200);
        });
      }, AUTOSAVE_MS);
    });

    setReady(true);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
      styleRef.current?.remove();
    };
  }, []);

  function handleSubmit() {
    setError(null);
    setSubmitting(true);
    submitGroup(groupId).then((r) => {
      setSubmitting(false);
      if (r.ok) setStatus("submitted");
      else setError(r.error);
    });
  }

  const runAs = resolveRunAs(codeRunMode);

  return (
    <div className="space-y-4">
      {status === "graded" && (
        <Card className="bg-sage-50 border-sage-200">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-sage-700" strokeWidth={1.75} />
            <p className="text-sm text-sage-800">
              Graded — the group can still edit and turn in a revision any
              time.
            </p>
          </div>
        </Card>
      )}

      {/* Presence bar */}
      <div className="flex items-center gap-2 rounded-cozy border border-wood-100 bg-cream-50 px-3 py-2">
        <Users className="w-4 h-4 text-wood-500 flex-shrink-0" strokeWidth={1.75} />
        <span className="text-xs text-wood-500">Editing together:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {peers.length === 0 ? (
            <span className="text-xs text-wood-400">just you</span>
          ) : (
            peers.map((p, i) => (
              <span
                key={`${p.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-cream-50 border border-wood-200 px-2 py-0.5 text-xs text-wood-700"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name === me.name ? `${p.name} (you)` : p.name}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="rounded-cozy-lg overflow-hidden border border-wood-200 shadow-cozy bg-cream-50">
        <div className="flex items-center justify-between px-4 py-2 bg-cream-100 border-b border-wood-100 text-xs">
          <div className="flex items-center gap-2 text-wood-600">
            <span className="font-mono">script.cs</span>
            <span className="text-wood-400">·</span>
            <span>C# · Unity · shared</span>
          </div>
          <div className="text-wood-500">
            {!ready ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting…
              </span>
            ) : saveState === "saving" ? (
              <span>Saving…</span>
            ) : saveState === "saved" ? (
              <span className="text-sage-700">Saved</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                Live
              </span>
            )}
          </div>
        </div>
        <div style={{ height: "60vh" }}>
          <Editor
            height="100%"
            defaultLanguage="csharp"
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace',
              fontLigatures: true,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
            }}
          />
        </div>
      </div>

      {runAs && (
        <Card>
          <h3 className="font-display text-lg text-wood-900 mb-3">Try it out</h3>
          <CodeRunner
            getCode={() => ytextRef.current?.toString() ?? ""}
            runAs={runAs}
            unitySimulationEnabled={unitySimulationEnabled}
          />
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm min-h-[1.5rem]">
          {error && (
            <span className="flex items-center gap-1.5 text-terracotta-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
          {!error && (status === "submitted" || status === "graded") && (
            <span className="flex items-center gap-1.5 text-sage-700">
              <Check className="w-3.5 h-3.5" />
              {status === "graded"
                ? "Graded — edits keep saving."
                : "Submitted for the group — edits keep saving."}
            </span>
          )}
          {!error && leaderSubmitsOnly && !isLeader && (
            <span className="text-wood-500">
              Only the group leader can submit.
            </span>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          size="lg"
          title={!canSubmit ? "Only the group leader can submit" : undefined}
        >
          <Send className="w-4 h-4" strokeWidth={2} />
          {submitting
            ? "Submitting…"
            : status === "submitted" || status === "graded"
              ? "Re-submit"
              : "Submit for group"}
        </Button>
      </div>
    </div>
  );
}
