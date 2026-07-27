"use client";

import { useState, useTransition } from "react";
import { Download, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportClassLogins } from "@/app/teacher/classes/actions";

interface ExportLoginsButtonProps {
  classId: string;
}

/** Turn a class name into a safe-ish CSV filename. */
function fileName(className: string): string {
  const base =
    className.replace(/[^\w.\- ]+/g, "").trim() || "class";
  return `${base} - logins.csv`;
}

export function ExportLoginsButton({ classId }: ExportLoginsButtonProps) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  function run() {
    const ok = window.confirm(
      "Export sign-in info for this class?\n\n" +
        "Any student who hasn't signed in yet will get a NEW password (put in the file). " +
        "Students who've already signed in keep their password and show a blank password cell.\n\n" +
        "A .csv will download that you can open in Google Sheets or Excel."
    );
    if (!ok) return;

    setMsg(null);
    start(async () => {
      const result = await exportClassLogins(classId);
      if (!result.ok) {
        setMsg({ text: result.error, error: true });
        return;
      }

      // Trigger the download client-side.
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(result.className);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const parts = [
        `${result.resetCount} new ${result.resetCount === 1 ? "password" : "passwords"}`,
        `${result.activeCount} already active`,
      ];
      if (result.failed.length > 0) {
        parts.push(`${result.failed.length} failed`);
      }
      setMsg({ text: `Downloaded — ${parts.join(", ")}.`, error: false });
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={run}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" strokeWidth={2} />
        )}
        {pending ? "Preparing…" : "Export logins (CSV)"}
      </Button>

      {msg && (
        <p
          className={[
            "mt-2 flex items-start gap-1.5 text-xs px-2.5 py-1.5 rounded-cozy border",
            msg.error
              ? "bg-terracotta-50 border-terracotta-200 text-terracotta-800"
              : "bg-sage-50 border-sage-200 text-sage-800",
          ].join(" ")}
        >
          {msg.error ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          {msg.text}
        </p>
      )}
    </div>
  );
}
