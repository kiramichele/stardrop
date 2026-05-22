import { StickyNote, Trash2, Plus } from "lucide-react";
import type { StudentNote } from "@/lib/students-server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { addStudentNote, deleteStudentNote } from "@/app/teacher/students/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Manage a student's pinned reminders. Lives on the student profile;
 * the same notes show read-only on the grading screen.
 */
export function StudentNotes({
  studentId,
  notes,
}: {
  studentId: string;
  notes: StudentNote[];
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <StickyNote className="w-4 h-4 text-honey-700" strokeWidth={2} />
        <h2 className="font-display text-lg text-wood-900">Reminders</h2>
      </div>
      <p className="text-xs text-wood-500 mb-4">
        Pinned to this student and surfaced on the grading screen for any of
        their submissions — e.g. &quot;extended time on tests&quot;.
      </p>

      {notes.length > 0 && (
        <ul className="space-y-2 mb-4">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-2 rounded-cozy border border-honey-200 bg-honey-50 p-3"
            >
              <p className="flex-1 min-w-0 text-sm text-honey-900 whitespace-pre-wrap leading-relaxed">
                {n.body}
              </p>
              <span className="flex-shrink-0 mt-0.5 text-[0.7rem] text-honey-600 tabular-nums">
                {formatDate(n.createdAt)}
              </span>
              <form action={deleteStudentNote.bind(null, n.id, studentId)}>
                <button
                  type="submit"
                  className="flex-shrink-0 text-honey-500 hover:text-terracotta-700 transition-colors"
                  aria-label="Delete reminder"
                  title="Delete reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={addStudentNote.bind(null, studentId)}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <Textarea
            name="body"
            rows={2}
            required
            placeholder="Add a reminder…"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add
        </Button>
      </form>
    </Card>
  );
}
