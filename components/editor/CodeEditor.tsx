"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Loader2 } from "lucide-react";
import { setupMonaco } from "@/lib/monaco/setup";

// Lazy-load the editor to avoid SSR issues with Monaco's window references
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

function EditorLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-cream-50 text-wood-500 gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Loading editor…</span>
    </div>
  );
}

export type PasteEvent = {
  content: string;
  length: number;
  timestamp: number;
};

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onPaste?: (event: PasteEvent) => void;
  onKeystroke?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  height?: string;
};

export function CodeEditor({
  value,
  onChange,
  onPaste,
  onKeystroke,
  onFocus,
  onBlur,
  readOnly = false,
  height = "500px",
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    setupMonaco(monaco);
    monaco.editor.setTheme("stardrop-cozy");

    // Paste handler — onDidPaste fires with the range that was inserted,
    // so we read the content from that range
    if (onPaste) {
      editorInstance.onDidPaste((e) => {
        const model = editorInstance.getModel();
        if (!model) return;
        const pastedText = model.getValueInRange(e.range);
        if (pastedText.length > 0) {
          onPaste({
            content: pastedText,
            length: pastedText.length,
            timestamp: Date.now(),
          });
        }
      });
    }

    if (onFocus) editorInstance.onDidFocusEditorWidget(onFocus);
    if (onBlur) editorInstance.onDidBlurEditorWidget(onBlur);

    setIsReady(true);
  };

  const handleChange: OnChange = (val) => {
    if (val !== undefined) {
      onChange(val);
      onKeystroke?.();
    }
  };

  return (
    <div className="rounded-cozy-lg overflow-hidden border border-wood-200 shadow-cozy bg-cream-50">
      {/* Editor chrome / status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-cream-100 border-b border-wood-100 text-xs">
        <div className="flex items-center gap-2 text-wood-600">
          <span className="font-mono">script.cs</span>
          <span className="text-wood-400">·</span>
          <span>C# · Unity</span>
        </div>
        <div className="text-wood-500">
          {isReady ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
              Ready
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-wood-300" />
              Loading
            </span>
          )}
        </div>
      </div>

      <div style={{ height }}>
        <Editor
          height="100%"
          defaultLanguage="csharp"
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, "Cascadia Code", monospace',
            fontLigatures: true,
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
          }}
        />
      </div>
    </div>
  );
}