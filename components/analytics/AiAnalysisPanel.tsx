"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import {
  analyzeAssignment,
  analyzeStudent,
} from "@/app/teacher/analytics/actions";

type Option = { id: string; label: string };

interface AiAnalysisPanelProps {
  mode: "assignment" | "student";
  title: string;
  description: string;
  options: Option[];
  apiConfigured: boolean;
}

export function AiAnalysisPanel({
  mode,
  title,
  description,
  options,
  apiConfigured,
}: AiAnalysisPanelProps) {
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  function run() {
    if (!selected) {
      setError("Choose one first.");
      return;
    }
    setError(null);
    setResult(null);
    start(async () => {
      const r =
        mode === "assignment"
          ? await analyzeAssignment(selected)
          : await analyzeStudent(selected);
      if (r.ok) setResult(r.text);
      else setError(r.error);
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-terracotta-600" strokeWidth={2} />
        <h3 className="font-display text-lg text-wood-900">{title}</h3>
      </div>
      <p className="text-xs text-wood-600 mb-3">{description}</p>

      {!apiConfigured ? (
        <p className="flex items-start gap-1.5 text-xs text-honey-800 bg-honey-50 border border-honey-200 rounded-cozy px-2.5 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to
          .env.local (and restart the server) to turn on AI analysis.
        </p>
      ) : options.length === 0 ? (
        <p className="text-sm text-wood-500 italic">Nothing to analyze yet.</p>
      ) : (
        <>
          <div className="flex gap-2">
            <Select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setError(null);
              }}
              className="flex-1"
              aria-label={`Choose ${mode}`}
            >
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button
              onClick={run}
              disabled={isPending}
              size="sm"
              className="flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              {isPending ? "Analyzing…" : "Analyze"}
            </Button>
          </div>

          {isPending && (
            <p className="text-xs text-wood-500 mt-2">
              Reading the work and writing up the analysis — this takes a few
              seconds.
            </p>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-2.5 py-1.5 mt-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          {result && (
            <div className="mt-3 rounded-cozy border border-wood-100 bg-cream-50 p-3.5 text-sm text-wood-800 whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
