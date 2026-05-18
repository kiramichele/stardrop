"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Info, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select, FieldHint, FieldError } from "@/components/ui/Input";

type ClassOption = { id: string; name: string; term: string };

type ImportResult = {
  created: Array<{
    username: string;
    first_name: string;
    last_name: string;
    password: string;
    section?: string;
  }>;
  skipped: Array<{ row: number; reason: string; data: Record<string, unknown> }>;
  errors: Array<{ row: number; message: string }>;
  classes_created: string[];
};

export default function ImportForm({ classes }: { classes: ClassOption[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [classId, setClassId] = useState("");
  const [term, setTerm] = useState("2026-27 Fall");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setTopError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("csv", file);
    formData.append("term", term);
    if (classId) formData.append("class_id", classId);

    try {
      const res = await fetch("/api/classes/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setTopError(data.error ?? "Upload failed");
        if (data.parse_errors) {
          setResult({
            created: [],
            skipped: [],
            errors: data.parse_errors,
            classes_created: [],
          });
        }
      } else {
        setResult(data);
      }
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function downloadCredentials() {
    if (!result?.created.length) return;
    const header = "first_name,last_name,username,password,section\n";
    const rows = result.created
      .map(
        (c) =>
          `${c.first_name},${c.last_name},${c.username},${c.password},${c.section ?? ""}`
      )
      .join("\n");
    const blob = new Blob([header + rows + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stardrop-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="csv-file">CSV file</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="file:mr-3 file:py-1.5 file:px-3 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-sm file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer file:transition-colors"
            />
          </div>

          <div>
            <Label htmlFor="term">Term</Label>
            <Input
              id="term"
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <FieldHint>Used to scope new classes (e.g. &quot;2026-27 Fall&quot;).</FieldHint>
          </div>

          <div>
            <Label htmlFor="target-class">
              Target class{" "}
              <span className="text-wood-500 font-normal">(optional)</span>
            </Label>
            <Select
              id="target-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">— Use section column from CSV —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.term})
                </option>
              ))}
            </Select>
            <FieldHint>
              Leave blank if your CSV has a section column. Pick a class to
              import everyone into one section.
            </FieldHint>
          </div>

          {topError && <FieldError>{topError}</FieldError>}

          <Button type="submit" disabled={!file || isUploading} size="lg" className="w-full">
            <Upload className="w-4 h-4" strokeWidth={2} />
            {isUploading ? "Importing…" : "Import"}
          </Button>
        </form>
      </Card>

      {result && (
        <div className="mt-6 space-y-4">
          {result.created.length > 0 && (
            <Card className="bg-sage-50 border-sage-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-display text-lg text-sage-800">
                    {result.created.length} student
                    {result.created.length === 1 ? "" : "s"} created
                  </p>
                  {result.classes_created.length > 0 && (
                    <p className="text-sm text-sage-700 mt-1">
                      New classes: {result.classes_created.join(", ")}
                    </p>
                  )}
                  <Button
                    onClick={downloadCredentials}
                    variant="secondary"
                    size="sm"
                    className="mt-4 !border-sage-300 !text-sage-800 hover:!bg-sage-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download credentials CSV
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {result.skipped.length > 0 && (
            <Card className="bg-cream-200 border-cream-300">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-wood-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-display text-lg text-wood-800 mb-2">
                    {result.skipped.length} skipped
                  </p>
                  <ul className="text-sm text-wood-700 space-y-1 max-h-48 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs text-wood-500">
                          Row {s.row}
                        </span>{" "}
                        — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {result.errors.length > 0 && (
            <Card className="bg-terracotta-50 border-terracotta-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-terracotta-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-display text-lg text-terracotta-800 mb-2">
                    {result.errors.length} error
                    {result.errors.length === 1 ? "" : "s"}
                  </p>
                  <ul className="text-sm text-terracotta-800 space-y-1 max-h-48 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs text-terracotta-600">
                          Row {e.row}
                        </span>{" "}
                        — {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}