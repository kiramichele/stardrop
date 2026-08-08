"use client";

import { useRef, useState, useTransition } from "react";
import { Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { sendDigest } from "@/app/teacher/parent-digest/actions";

type ClassOption = { id: string; label: string };

export function ParentDigestForm({ classes }: { classes: ClassOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set()
  );
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; sentCount: number; skippedNoEmailCount: number; failedCount: number }
    | { ok: false; error: string }
    | null
  >(null);

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await sendDigest(formData);
      setResult(r);
      if (r.ok) {
        formRef.current?.reset();
        setSelectedClasses(new Set());
      }
    });
  }

  return (
    <Card>
      <h3 className="font-display text-lg text-wood-900 mb-1">
        Write a digest
      </h3>
      <p className="text-xs text-wood-600 mb-4">
        Goes straight to parent/guardian emails on file — nothing scheduled,
        nothing sent unless you hit Send.
      </p>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="pd-subject">Subject</Label>
          <Input
            id="pd-subject"
            name="subject"
            type="text"
            required
            placeholder="This week in Game Design"
          />
        </div>

        <div>
          <Label htmlFor="pd-body">Message</Label>
          <Textarea
            id="pd-body"
            name="body"
            required
            rows={8}
            placeholder="What the class has been up to, what's coming up, how to reach you…"
          />
        </div>

        <div>
          <Label className="text-xs">Send to</Label>
          {classes.length === 0 ? (
            <p className="text-sm text-wood-500 italic mt-1">
              No classes yet.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-xs text-wood-500">
                {selectedClasses.size === 0
                  ? "Nobody checked below — this goes to every class."
                  : `Sending to ${selectedClasses.size} class${
                      selectedClasses.size === 1 ? "" : "es"
                    } only.`}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {classes.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-1.5 text-sm text-wood-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="class_ids"
                      value={c.id}
                      checked={selectedClasses.has(c.id)}
                      onChange={() => toggleClass(c.id)}
                      className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {result && !result.ok && (
          <p className="flex items-start gap-1.5 text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {result.error}
          </p>
        )}
        {result && result.ok && (
          <p className="flex items-start gap-1.5 text-sm text-sage-800 bg-sage-50 border border-sage-200 rounded-cozy px-3 py-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Sent to {result.sentCount}{" "}
              {result.sentCount === 1 ? "parent" : "parents"}.
              {result.skippedNoEmailCount > 0 &&
                ` ${result.skippedNoEmailCount} student${
                  result.skippedNoEmailCount === 1 ? "" : "s"
                } in scope have no parent email on file.`}
              {result.failedCount > 0 &&
                ` ${result.failedCount} failed to send — check the Resend dashboard.`}
            </span>
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          <Send className="w-4 h-4" strokeWidth={2} />
          {isPending ? "Sending…" : "Send digest"}
        </Button>
      </form>
    </Card>
  );
}
