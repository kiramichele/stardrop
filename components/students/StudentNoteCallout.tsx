import { StickyNote } from "lucide-react";
import type { StudentNote } from "@/lib/students-server";

/**
 * Read-only pinned reminders for a student — a honey sticky-note callout
 * surfaced while grading their work. Renders nothing when there are none.
 */
export function StudentNoteCallout({ notes }: { notes: StudentNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="mb-6 rounded-cozy-lg border border-honey-200 bg-honey-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="w-4 h-4 text-honey-700" strokeWidth={2} />
        <p className="label-eyebrow text-honey-800">
          {notes.length === 1 ? "Reminder" : "Reminders"}
        </p>
      </div>
      <ul className="space-y-1.5">
        {notes.map((n) => (
          <li
            key={n.id}
            className="flex gap-2 text-sm text-honey-900 leading-relaxed"
          >
            <span className="text-honey-400 select-none">•</span>
            <span className="whitespace-pre-wrap">{n.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
