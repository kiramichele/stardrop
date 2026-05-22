"use client";

import { useRef, useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  TriangleAlert,
  X,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldHint, FieldError } from "@/components/ui/Input";
import type { MatchReport } from "@/lib/gradebook";
import {
  uploadGradebookTemplate,
  clearGradebookTemplate,
  type UploadTemplateResult,
} from "@/app/teacher/students/actions";

type Props = {
  hasTemplate: boolean;
  filename: string | null;
  uploadedAt: string | null;
  report: MatchReport | null;
  parseError: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Download a CSV of logins for students created during an upload. */
function downloadCredentials(
  created: { name: string; username: string; password: string; section: string }[]
) {
  const header = "name,username,password,section\n";
  const rows = created
    .map((c) => `${c.name},${c.username},${c.password},${c.section}`)
    .join("\n");
  const blob = new Blob([header + rows + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `new-students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** A collapsible list of names — keeps long lists from dominating the card. */
function NameList({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <details className="mt-1">
      <summary className="text-xs text-wood-600 cursor-pointer hover:text-wood-800">
        {label}
      </summary>
      <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-wood-600 space-y-0.5 pl-3">
        {names.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </details>
  );
}

export function GradebookExport({
  hasTemplate,
  filename,
  uploadedAt,
  report,
  parseError,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] =
    useState<UploadTemplateResult | null>(null);
  const [showUpload, setShowUpload] = useState(!hasTemplate);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const fd = new FormData();
    fd.append("template", file);
    try {
      const res = await uploadGradebookTemplate(fd);
      setUploadResult(res);
      if (res.ok) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setShowUpload(false);
      }
    } catch {
      setUploadResult({ ok: false, error: "Upload failed. Try again." });
    } finally {
      setUploading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/teacher/gradebook/export");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setExportError(data?.error ?? "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const match = res.headers
        .get("Content-Disposition")
        ?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? "gradebook-canvas.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearGradebookTemplate();
      setUploadResult(null);
      setShowUpload(true);
    } finally {
      setClearing(false);
    }
  }

  const showForm = showUpload || !hasTemplate;
  const sync = uploadResult?.ok ? uploadResult.sync : null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-cozy bg-terracotta-100 flex items-center justify-center">
          <FileSpreadsheet
            className="w-5 h-5 text-terracotta-700"
            strokeWidth={1.75}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-wood-900 leading-tight">
            Export gradebook to Canvas
          </h3>
          <p className="text-sm text-wood-600 mt-0.5">
            Upload a gradebook CSV exported from Canvas. The app adds any new
            students and classes from it, fills in grades, and hands the file
            back ready to re-import into Canvas.
          </p>
        </div>
        {hasTemplate && !parseError && (
          <Button
            onClick={handleExport}
            disabled={exporting}
            size="sm"
            className="flex-shrink-0"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" strokeWidth={2} />
            )}
            {exporting ? "Building…" : "Export CSV"}
          </Button>
        )}
      </div>

      {exportError && (
        <div className="mt-3">
          <FieldError>{exportError}</FieldError>
        </div>
      )}

      {/* Stored template + match report */}
      {hasTemplate && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm bg-cream-200 rounded-cozy px-3 py-2">
            <FileSpreadsheet
              className="w-4 h-4 text-wood-500 flex-shrink-0"
              strokeWidth={1.75}
            />
            <span className="text-wood-800 font-medium truncate">
              {filename}
            </span>
            {uploadedAt && (
              <span className="text-wood-500 text-xs flex-shrink-0">
                · uploaded {formatDate(uploadedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="ml-auto flex-shrink-0 text-wood-400 hover:text-terracotta-700 transition-colors disabled:opacity-50"
              title="Remove template"
              aria-label="Remove template"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
              <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {report && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-sage-800">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  <span className="font-semibold">
                    {report.cellsWritten}
                  </span>{" "}
                  {report.cellsWritten === 1 ? "grade" : "grades"} ready ·{" "}
                  {report.matched}/{report.templateRowCount} template rows
                  matched
                </span>
              </div>

              {report.newColumns.length > 0 && (
                <p className="text-xs text-wood-600">
                  {report.newColumns.length}{" "}
                  {report.newColumns.length === 1
                    ? "assignment"
                    : "assignments"}{" "}
                  not in your template will be added as new columns.
                </p>
              )}

              {(report.unmatchedTemplateRows.length > 0 ||
                report.unmatchedAppStudents.length > 0 ||
                report.missingStudentId.length > 0 ||
                report.unmatchedTemplateColumns.length > 0) && (
                <div className="bg-honey-50 border border-honey-200 rounded-cozy px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-honey-900 font-medium">
                    <TriangleAlert className="w-4 h-4 flex-shrink-0" />
                    Worth a look before you export
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {report.unmatchedTemplateRows.length > 0 && (
                      <div>
                        <p className="text-xs text-honey-900">
                          {report.unmatchedTemplateRows.length} Canvas template{" "}
                          {report.unmatchedTemplateRows.length === 1
                            ? "row"
                            : "rows"}{" "}
                          couldn&apos;t be matched to a student here — they
                          export without grades.
                        </p>
                        <NameList
                          label="Show rows"
                          names={report.unmatchedTemplateRows}
                        />
                      </div>
                    )}
                    {report.unmatchedAppStudents.length > 0 && (
                      <div>
                        <p className="text-xs text-honey-900">
                          {report.unmatchedAppStudents.length}{" "}
                          {report.unmatchedAppStudents.length === 1
                            ? "student isn't"
                            : "students aren't"}{" "}
                          in the Canvas template — their grades won&apos;t
                          export.
                        </p>
                        <NameList
                          label="Show students"
                          names={report.unmatchedAppStudents}
                        />
                      </div>
                    )}
                    {report.missingStudentId.length > 0 && (
                      <div>
                        <p className="text-xs text-honey-900">
                          {report.missingStudentId.length}{" "}
                          {report.missingStudentId.length === 1
                            ? "student has"
                            : "students have"}{" "}
                          no student ID yet — add IDs (on each student&apos;s
                          page, or by re-importing your roster CSV) for
                          reliable matching.
                        </p>
                        <NameList
                          label="Show students"
                          names={report.missingStudentId}
                        />
                      </div>
                    )}
                    {report.unmatchedTemplateColumns.length > 0 && (
                      <div>
                        <p className="text-xs text-honey-900">
                          {report.unmatchedTemplateColumns.length} template{" "}
                          {report.unmatchedTemplateColumns.length === 1
                            ? "column has"
                            : "columns have"}{" "}
                          no matching assignment here — left unchanged.
                        </p>
                        <NameList
                          label="Show columns"
                          names={report.unmatchedTemplateColumns}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!showForm && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="text-xs text-terracotta-700 hover:text-terracotta-800 transition-colors"
            >
              Replace template
            </button>
          )}
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <form
          onSubmit={handleUpload}
          className={hasTemplate ? "mt-4 pt-4 border-t border-wood-100" : "mt-4"}
        >
          {!hasTemplate && (
            <FieldHint>
              In Canvas, open Grades → Export → &quot;Export Entire
              Gradebook&quot; and upload that CSV. New students and classes in
              it are added automatically — re-upload anytime to pick up new
              students.
            </FieldHint>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-wood-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-sm file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer file:transition-colors"
            />
            <Button type="submit" disabled={!file || uploading} size="sm">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" strokeWidth={2} />
              )}
              {uploading
                ? "Uploading…"
                : hasTemplate
                  ? "Replace"
                  : "Upload template"}
            </Button>
            {hasTemplate && (
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setFile(null);
                  setUploadResult(null);
                }}
                className="text-xs text-wood-500 hover:text-wood-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {uploadResult && !uploadResult.ok && (
        <div className="mt-3">
          <FieldError>{uploadResult.error}</FieldError>
        </div>
      )}
      {uploadResult && uploadResult.ok && sync && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-sage-800">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              Template saved — {uploadResult.studentCount} students,{" "}
              {uploadResult.assignmentCount} assignment columns.
            </span>
          </div>

          {sync.classesCreated.length > 0 && (
            <p className="text-xs text-wood-600 pl-6">
              New {sync.classesCreated.length === 1 ? "class" : "classes"}:{" "}
              {sync.classesCreated.join(", ")}.
            </p>
          )}

          {sync.created.length > 0 ? (
            <div className="pl-6">
              <p className="text-sm text-sage-800">
                {sync.created.length} new student{" "}
                {sync.created.length === 1 ? "account" : "accounts"} created
                {sync.enrolled > 0 && `, ${sync.enrolled} newly enrolled`}.
              </p>
              <button
                type="button"
                onClick={() => downloadCredentials(sync.created)}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-terracotta-700 hover:text-terracotta-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download logins for new students
              </button>
            </div>
          ) : (
            <p className="text-xs text-wood-500 pl-6">
              {sync.enrolled > 0
                ? `${sync.enrolled} students newly enrolled — no new accounts needed.`
                : "Everyone in the file was already set up."}
            </p>
          )}

          {sync.errors.length > 0 && (
            <ul className="pl-6 text-xs text-terracotta-700 space-y-0.5 max-h-32 overflow-y-auto">
              {sync.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
