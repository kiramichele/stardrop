"use client";

import { useState, useTransition } from "react";
import {
  Play,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { runCode, type RunResult } from "@/app/playground/actions";
import { csharpEnabled, unityEnabled, type CodeRunMode } from "@/lib/playground";

/**
 * Reusable run-buttons + output panel. Drops under any code editor.
 * Owns its own result state — caller just hands in the latest code
 * via a getter (so the editor's controlled value flows through here).
 */
export function CodeRunner({
  getCode,
  mode = "both",
  language = "csharp",
}: {
  /** Called on each Run click. Returns the latest editor content. */
  getCode: () => string;
  /** Which run buttons to show. */
  mode?: CodeRunMode;
  /** Helps explain which mode is appropriate to the student. */
  language?: string;
}) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, start] = useTransition();
  const [busyMode, setBusyMode] = useState<"csharp" | "unity" | null>(null);

  if (mode === "none") return null;

  const showCSharp = csharpEnabled(mode);
  const showUnity = unityEnabled(mode);
  const isCsharpLang = language === "csharp";

  function go(which: "csharp" | "unity") {
    setBusyMode(which);
    start(async () => {
      const out = await runCode(getCode(), which);
      setResult(out);
      setBusyMode(null);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showCSharp && (
          <Button
            onClick={() => go("csharp")}
            disabled={pending}
            title={
              isCsharpLang
                ? "Compile and execute as plain C# (no Unity APIs)"
                : "Will try to run as C# even though the editor language is something else"
            }
          >
            {busyMode === "csharp" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" strokeWidth={2} />
                Run as C#
              </>
            )}
          </Button>
        )}
        {showUnity && (
          <Button
            variant="secondary"
            onClick={() => go("unity")}
            disabled={pending}
            title="Have the AI describe what this Unity script would do in the Editor"
          >
            {busyMode === "unity" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Simulate in Unity
              </>
            )}
          </Button>
        )}
        {showCSharp && showUnity && (
          <p className="text-xs text-wood-500 ml-1">
            <strong>Run as C#</strong> for plain console code;{" "}
            <strong>Simulate in Unity</strong> for Unity scripts.
          </p>
        )}
      </div>

      <ResultPanel result={result} pending={pending} />
    </div>
  );
}

function ResultPanel({
  result,
  pending,
}: {
  result: RunResult | null;
  pending: boolean;
}) {
  if (!result && !pending) {
    return (
      <div className="rounded-cozy border border-dashed border-wood-200 bg-cream-50 px-4 py-6 text-center text-sm text-wood-500">
        Output will appear here after you click Run.
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded-cozy border border-wood-200 bg-cream-50 px-4 py-6 text-center text-sm text-wood-500">
        <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
        Working on it…
      </div>
    );
  }

  if (result.mode === "csharp") {
    if (result.ok) {
      return (
        <div className="rounded-cozy border border-sage-200 bg-sage-50 overflow-hidden">
          <Banner
            tint="sage"
            icon={<Check className="w-3.5 h-3.5" />}
            label="Ran successfully"
          />
          <TerminalBlock stdout={result.stdout} stderr={result.stderr} />
        </div>
      );
    }
    const tint =
      result.kind === "compile"
        ? "terracotta"
        : result.kind === "timeout"
          ? "honey"
          : "terracotta";
    const label =
      result.kind === "compile"
        ? "Compile error"
        : result.kind === "runtime"
          ? "Runtime error"
          : result.kind === "timeout"
            ? "Took too long"
            : "Couldn't run";
    return (
      <div
        className={[
          "rounded-cozy overflow-hidden border",
          tint === "honey"
            ? "border-honey-200 bg-honey-50"
            : "border-terracotta-200 bg-terracotta-50",
        ].join(" ")}
      >
        <Banner
          tint={tint}
          icon={
            result.kind === "timeout" ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )
          }
          label={label}
          detail={result.message}
        />
        <TerminalBlock stdout={result.stdout ?? ""} stderr={result.stderr ?? ""} />
      </div>
    );
  }

  // result.mode === "unity"
  if (result.ok) {
    return (
      <div className="rounded-cozy border border-terracotta-200 bg-terracotta-50/60 overflow-hidden">
        <Banner
          tint="terracotta"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="If this ran in Unity…"
        />
        <div className="px-4 py-4 text-sm text-wood-800 whitespace-pre-wrap leading-relaxed">
          {result.narrative}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-cozy border border-terracotta-200 bg-terracotta-50 px-3 py-3 text-sm text-terracotta-800">
      <AlertTriangle className="inline w-4 h-4 mr-1.5 -mt-0.5" />
      {result.error}
    </div>
  );
}

function Banner({
  tint,
  icon,
  label,
  detail,
}: {
  tint: "sage" | "terracotta" | "honey";
  icon: React.ReactNode;
  label: string;
  detail?: string;
}) {
  const cls =
    tint === "sage"
      ? "bg-sage-100 text-sage-800 border-sage-200"
      : tint === "honey"
        ? "bg-honey-100 text-honey-800 border-honey-200"
        : "bg-terracotta-100 text-terracotta-800 border-terracotta-200";
  return (
    <div
      className={[
        "flex items-center gap-2 px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide-label",
        cls,
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
      {detail && (
        <span className="font-normal normal-case tracking-normal text-wood-700">
          · {detail}
        </span>
      )}
    </div>
  );
}

function TerminalBlock({
  stdout,
  stderr,
}: {
  stdout: string;
  stderr: string;
}) {
  if (!stdout && !stderr) {
    return (
      <p className="px-4 py-3 text-xs italic text-wood-500">No output.</p>
    );
  }
  return (
    <div className="px-3 py-3 space-y-2">
      {stdout && (
        <pre className="rounded bg-wood-900 text-cream-50 text-xs font-mono p-3 overflow-x-auto whitespace-pre-wrap">
          {stdout}
        </pre>
      )}
      {stderr && (
        <pre className="rounded bg-terracotta-900/95 text-terracotta-100 text-xs font-mono p-3 overflow-x-auto whitespace-pre-wrap">
          {stderr}
        </pre>
      )}
    </div>
  );
}
