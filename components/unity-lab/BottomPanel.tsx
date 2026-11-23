"use client";

import { AlertCircle, AlertTriangle, Info, Loader2, Sparkles } from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { scriptClassName, type GameObject, type Script } from "@/lib/unity-lab/scene";
import type { CompileError, ConsoleEntry, SimulationResult } from "@/lib/unity-lab/simulation";

export type BottomTab = "script" | "console" | "simulation";

interface BottomPanelProps {
  tab: BottomTab;
  onTab: (t: BottomTab) => void;
  selected: GameObject | null;
  scripts: Script[];
  activeScriptId: string | null;
  onActiveScript: (id: string) => void;
  onScriptChange: (id: string, code: string) => void;
  editable: boolean;
  /** Console entries visible so far (playback reveals them over time). */
  consoleEntries: ConsoleEntry[];
  compileErrors: CompileError[];
  result: SimulationResult | null;
  simulating: boolean;
  simError: string | null;
}

export function BottomPanel(props: BottomPanelProps) {
  const { tab, onTab, consoleEntries, compileErrors } = props;
  const problemCount = compileErrors.length + consoleEntries.filter((e) => e.type === "error").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div role="tablist" className="flex items-center gap-1 px-2 h-8 border-b border-wood-200 bg-cream-100 flex-shrink-0">
        <TabButton active={tab === "script"} onClick={() => onTab("script")}>
          Script
        </TabButton>
        <TabButton active={tab === "console"} onClick={() => onTab("console")}>
          Console
          {consoleEntries.length + compileErrors.length > 0 && (
            <span
              className={`ml-1.5 rounded-full px-1.5 text-[10px] ${
                problemCount > 0 ? "bg-terracotta-100 text-terracotta-800" : "bg-wood-200 text-wood-700"
              }`}
            >
              {consoleEntries.length + compileErrors.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "simulation"} onClick={() => onTab("simulation")}>
          Simulation
        </TabButton>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "script" && <ScriptTab {...props} />}
        {tab === "console" && <ConsoleTab {...props} />}
        {tab === "simulation" && <SimulationTab {...props} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center px-2.5 h-7 text-xs rounded-t ${
        active ? "bg-cream-50 text-wood-900 font-semibold border border-b-0 border-wood-200" : "text-wood-600 hover:text-wood-900"
      }`}
    >
      {children}
    </button>
  );
}

function ScriptTab({
  selected,
  scripts,
  activeScriptId,
  onActiveScript,
  onScriptChange,
  editable,
}: BottomPanelProps) {
  const attached = (selected?.components ?? []).flatMap((c) =>
    c.type === "Script" ? [c.scriptId] : []
  );
  const scriptsById = new Map(scripts.map((s) => [s.id, s]));
  const visibleId =
    activeScriptId && attached.includes(activeScriptId) ? activeScriptId : attached[0] ?? null;
  const script = visibleId ? scriptsById.get(visibleId) : undefined;

  if (!script) {
    return (
      <p className="p-4 text-sm text-wood-500">
        {selected
          ? <>“{selected.name}” has no script. Choose <strong>Add Component → New script…</strong> in the Inspector to give it one.</>
          : "Select a GameObject to see its script."}
      </p>
    );
  }

  const className = scriptClassName(script.code);

  return (
    <div className="flex flex-col h-full min-h-0">
      {attached.length > 1 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-wood-100 flex-shrink-0">
          {attached.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onActiveScript(id)}
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                id === script.id ? "bg-sky-100 text-sky-950" : "text-wood-600 hover:bg-cream-200"
              }`}
            >
              {scriptClassName(scriptsById.get(id)?.code ?? "") ?? "Untitled"}.cs
            </button>
          ))}
        </div>
      )}
      {!className && (
        <p className="flex items-center gap-1.5 px-3 py-1 text-xs text-honey-800 bg-honey-50 border-b border-honey-200 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          Unity needs a class here, like <code>public class PlayerMove : MonoBehaviour</code>.
        </p>
      )}
      <div className="flex-1 min-h-0 p-2">
        <CodeEditor
          key={script.id}
          value={script.code}
          onChange={(code) => onScriptChange(script.id, code)}
          readOnly={!editable}
          height="100%"
          fileName={`${className ?? "Untitled"}.cs`}
          languageLabel={editable ? "C# · MonoBehaviour" : "Read-only during Play"}
        />
      </div>
    </div>
  );
}

function ConsoleTab({ consoleEntries, compileErrors, simulating }: BottomPanelProps) {
  if (simulating) {
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-wood-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Compiling and running your scene…
      </p>
    );
  }
  if (consoleEntries.length === 0 && compileErrors.length === 0) {
    return (
      <p className="p-4 text-sm text-wood-500">
        Press <strong>Play</strong> to run your scene. <code>Debug.Log</code> messages show up here.
      </p>
    );
  }
  return (
    <ul className="h-full overflow-y-auto font-mono text-xs divide-y divide-wood-100">
      {compileErrors.map((e, i) => (
        <li key={`c${i}`} className="flex items-start gap-2 px-3 py-1.5 bg-terracotta-50 text-terracotta-900">
          <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          <span>
            {e.script}.cs{e.line > 0 ? `(${e.line})` : ""}: error: {e.message}
          </span>
        </li>
      ))}
      {consoleEntries.map((e, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 px-3 py-1.5 ${
            e.type === "error"
              ? "bg-terracotta-50 text-terracotta-900"
              : e.type === "warning"
                ? "bg-honey-50 text-honey-900"
                : "text-wood-800"
          }`}
        >
          {e.type === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          ) : e.type === "warning" ? (
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          ) : (
            <Info className="w-3.5 h-3.5 mt-px flex-shrink-0 text-wood-400" />
          )}
          <span className="text-wood-400 tabular-nums w-12 flex-shrink-0">{e.time.toFixed(2)}s</span>
          <span className="whitespace-pre-wrap break-words">{e.message}</span>
        </li>
      ))}
    </ul>
  );
}

function SimulationTab({ result, simulating, simError }: BottomPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 text-sm text-wood-800 space-y-3">
      {simulating && (
        <p className="flex items-center gap-2 text-wood-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Claude is working out what Unity would do…
          this can take up to a minute.
        </p>
      )}
      {simError && (
        <p className="flex items-start gap-2 text-terracotta-800">
          <AlertCircle className="w-4 h-4 mt-px flex-shrink-0" /> {simError}
        </p>
      )}
      {!simulating && !simError && !result && (
        <p className="text-wood-500">
          After you press <strong>Play</strong>, an explanation of what your scene did — and why —
          appears here.
        </p>
      )}
      {result && !simulating && (
        <>
          <p className="flex items-center gap-1.5 text-xs text-wood-500">
            <Sparkles className="w-3.5 h-3.5" />
            AI simulation — a close estimate of what real Unity would do, not the real engine.
          </p>
          <div className="whitespace-pre-wrap leading-relaxed">{result.explanation}</div>
        </>
      )}
    </div>
  );
}
