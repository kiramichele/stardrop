"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  postAnnouncement,
  removeAnnouncement,
} from "@/app/teacher/announcements-actions";
import type { Announcement } from "@/lib/announcements-server";

type ClassOption = { id: string; label: string };

export function AnnouncementsManager({
  announcements,
  classes,
}: {
  announcements: Announcement[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set()
  );
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleClass(id: string) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await postAnnouncement(formData);
      if (r.ok) {
        formRef.current?.reset();
        setSelectedClasses(new Set());
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Take this announcement down?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const r = await removeAnnouncement(id);
      if (r.ok) router.refresh();
      else alert(r.error ?? "Couldn't delete it.");
      setDeletingId(null);
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="w-4 h-4 text-terracotta-600" strokeWidth={2} />
        <h3 className="font-display text-lg text-wood-900">Announcements</h3>
      </div>
      <p className="text-xs text-wood-600 mb-4">
        Shows on the matching students&apos; dashboards until you take it
        down.
      </p>

      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <Textarea
          name="body"
          required
          rows={3}
          placeholder="No class Friday — enjoy the long weekend!"
        />

        {classes.length > 0 && (
          <div>
            <p className="text-xs text-wood-500 mb-1.5">
              {selectedClasses.size === 0
                ? "Nobody checked below — this goes to every class."
                : `Showing to ${selectedClasses.size} class${
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

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Posting…" : "Post announcement"}
        </Button>
      </form>

      <div className="mt-5 pt-4 border-t border-wood-100">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Nothing posted"
            description="Announcements you post show up here and on student dashboards."
          />
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-cozy border border-wood-100 bg-cream-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-wood-900 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="text-xs text-wood-500 mt-1">
                    {new Date(a.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {a.createdByName && ` · ${a.createdByName}`}
                    {" · "}
                    {a.classLabels ? a.classLabels.join(", ") : "All classes"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending && deletingId === a.id}
                  className="flex-shrink-0 p-1.5 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors disabled:opacity-50"
                  title="Take down"
                  aria-label="Take down this announcement"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
