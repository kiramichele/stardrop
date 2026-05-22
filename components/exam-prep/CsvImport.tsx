"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ImportResult } from "@/app/exam-prep/manage-actions";

/** A reusable CSV-import widget — used for the glossary and the question bank. */
export function CsvImport({
  columns,
  templateName,
  templateContent,
  onImport,
}: {
  columns: string;
  templateName: string;
  templateContent: string;
  onImport: (csvText: string) => Promise<ImportResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const r = await onImport(text);
      setResult(r);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setResult({
        added: 0,
        errors: ["Import failed — check the file and try again."],
      });
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-wood-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-xs file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleImport}
          disabled={!file || busy}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" strokeWidth={2} />
          )}
          Import CSV
        </Button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1 text-xs font-medium text-wood-600 hover:text-terracotta-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Template
        </button>
      </div>
      <p className="text-xs text-wood-500 mt-1.5">Columns: {columns}</p>

      {result && (
        <div className="mt-2 text-sm">
          {result.added > 0 && (
            <p className="flex items-center gap-1.5 text-sage-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Added {result.added}{" "}
              {result.added === 1 ? "row" : "rows"}.
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="text-xs text-terracotta-700 space-y-0.5 mt-1 max-h-32 overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {result.added === 0 && result.errors.length === 0 && (
            <p className="text-xs text-wood-500">No rows found in that file.</p>
          )}
        </div>
      )}
    </div>
  );
}
