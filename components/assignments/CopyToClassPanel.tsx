"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { copyAssignmentToClasses } from "@/app/teacher/assignments/actions";

type ClassOption = { id: string; name: string };

export function CopyToClassPanel({
  assignmentId,
  classes,
}: {
  assignmentId: string;
  /** Classes other than the one this assignment already belongs to. */
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, start] = useTransition();

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setMsg(null);
  }

  function submit() {
    if (selected.size === 0) {
      setMsg({ text: "Pick at least one class.", error: true });
      return;
    }
    start(async () => {
      const r = await copyAssignmentToClasses(assignmentId, [...selected]);
      if (r.ok) {
        setMsg({
          text: `Copied to ${r.count} ${
            r.count === 1 ? "class" : "classes"
          } as a draft — find them in your assignments list.`,
          error: false,
        });
        setSelected(new Set());
        router.refresh();
      } else {
        setMsg({ text: r.error, error: true });
      }
    });
  }

  return (
    <Card>
      <h3 className="font-display text-lg text-wood-900 mb-1">
        Copy to another class
      </h3>
      <p className="text-xs text-wood-600 mb-3">
        Makes an independent draft copy in each class you pick — with its own
        submissions and grades.
      </p>

      {classes.length === 0 ? (
        <p className="text-xs text-wood-500 italic">
          This is your only class — nowhere to copy to.
        </p>
      ) : (
        <>
          <div className="rounded-cozy border border-wood-200 bg-white divide-y divide-wood-100 mb-3">
            {classes.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-cream-100"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="w-3.5 h-3.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400 flex-shrink-0"
                />
                <span className="truncate text-wood-800">{c.name}</span>
              </label>
            ))}
          </div>

          {msg && (
            <p
              className={[
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-cozy border mb-3",
                msg.error
                  ? "bg-terracotta-50 border-terracotta-200 text-terracotta-800"
                  : "bg-sage-50 border-sage-200 text-sage-800",
              ].join(" ")}
            >
              {msg.error ? (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {msg.text}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={isPending}
            size="sm"
            className="w-full"
          >
            <Copy className="w-4 h-4" strokeWidth={2} />
            {isPending ? "Copying…" : "Copy to selected"}
          </Button>
        </>
      )}
    </Card>
  );
}
