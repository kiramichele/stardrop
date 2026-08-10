"use client";

import { useState, useTransition } from "react";
import { MessageSquareText } from "lucide-react";
import {
  updateGradeGridScore,
} from "@/app/teacher/gradebook/actions";
import { GradeNoteModal } from "./GradeNoteModal";
import type {
  GradeGridAssignment,
  GradeGridCell,
  GradeGridData,
  GradeGridStudent,
} from "@/lib/grade-grid-server";

type CellMap = Record<string, Record<string, GradeGridCell>>;

const EMPTY_CELL: GradeGridCell = {
  submissionId: null,
  score: null,
  note: null,
  status: null,
  excused: false,
};

export function GradeGridTable({ data }: { classId: string; data: GradeGridData }) {
  const [cells, setCells] = useState<CellMap>(data.cells);
  const [noteFor, setNoteFor] = useState<{
    student: GradeGridStudent;
    assignment: GradeGridAssignment;
  } | null>(null);

  function patchCell(
    studentId: string,
    assignmentId: string,
    patch: Partial<GradeGridCell>
  ) {
    setCells((prev) => {
      const studentCells = prev[studentId] ?? {};
      const current = studentCells[assignmentId] ?? EMPTY_CELL;
      return {
        ...prev,
        [studentId]: {
          ...studentCells,
          [assignmentId]: { ...current, ...patch },
        },
      };
    });
  }

  return (
    <>
      <div
        className="overflow-auto border border-wood-200 rounded-cozy-lg bg-cream-50"
        style={{ maxHeight: "75vh" }}
      >
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="sticky top-0 left-0 z-30 bg-cream-100 border-b border-r border-wood-200 px-3 py-2 text-left min-w-[10rem]"
                scope="col"
              >
                <span className="label-eyebrow text-wood-500">Student</span>
              </th>
              {data.assignments.map((a) => (
                <th
                  key={a.id}
                  className="sticky top-0 z-20 bg-cream-100 border-b border-r border-wood-200 px-2 py-2 text-center align-bottom w-24"
                  scope="col"
                  title={`${a.title} · ${a.points} pts`}
                >
                  <span className="block text-xs font-medium text-wood-800 leading-tight line-clamp-3">
                    {a.title}
                  </span>
                  <span className="block text-[0.65rem] text-wood-400 mt-0.5">
                    /{a.points}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-cream-50 border-b border-r border-wood-200 px-3 py-1.5 text-left font-medium text-wood-900 whitespace-nowrap"
                >
                  {s.firstName} {s.lastName}
                </th>
                {data.assignments.map((a) => (
                  <GradeCell
                    key={a.id}
                    student={s}
                    assignment={a}
                    cell={cells[s.id]?.[a.id] ?? EMPTY_CELL}
                    onScoreSaved={(score) =>
                      patchCell(s.id, a.id, { score, status: "graded" })
                    }
                    onOpenNote={() => setNoteFor({ student: s, assignment: a })}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noteFor && (
        <GradeNoteModal
          studentId={noteFor.student.id}
          studentName={`${noteFor.student.firstName} ${noteFor.student.lastName}`}
          assignmentId={noteFor.assignment.id}
          assignmentTitle={noteFor.assignment.title}
          initialNote={cells[noteFor.student.id]?.[noteFor.assignment.id]?.note ?? null}
          onClose={() => setNoteFor(null)}
          onSaved={(note) => patchCell(noteFor.student.id, noteFor.assignment.id, { note })}
        />
      )}
    </>
  );
}

function GradeCell({
  student,
  assignment,
  cell,
  onScoreSaved,
  onOpenNote,
}: {
  student: GradeGridStudent;
  assignment: GradeGridAssignment;
  cell: GradeGridCell;
  onScoreSaved: (score: number | null) => void;
  onOpenNote: () => void;
}) {
  const scoreStr = cell.score !== null ? String(cell.score) : "";
  const [value, setValue] = useState(scoreStr);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // The score can change from outside a direct edit here (e.g. adding a
  // note to an ungraded cell defaults the score to 0) — stay in sync.
  // Adjusted during render (React's documented pattern for this), not in
  // an effect, so it can't cascade an extra render.
  const [trackedScoreStr, setTrackedScoreStr] = useState(scoreStr);
  if (scoreStr !== trackedScoreStr) {
    setTrackedScoreStr(scoreStr);
    setValue(scoreStr);
  }

  function commit() {
    const raw = value.trim();
    if (raw === scoreStr) return;
    setError(null);
    startTransition(async () => {
      const r = await updateGradeGridScore(student.id, assignment.id, raw);
      if (r.ok) {
        onScoreSaved(raw === "" ? null : Number.parseFloat(raw));
      } else {
        setError(r.error);
        setValue(scoreStr);
      }
    });
  }

  if (cell.excused) {
    return (
      <td
        className="border-b border-r border-wood-100 bg-cream-200/60 text-center align-middle w-24"
        title={`Excused — ${student.firstName} ${student.lastName}, ${assignment.title}`}
      >
        <span className="text-xs font-semibold text-wood-400">EX</span>
      </td>
    );
  }

  const needsGrading = cell.status === "submitted" && cell.score === null;

  return (
    <td
      className={[
        "relative border-b border-r border-wood-100 p-0 align-middle w-24",
        needsGrading ? "bg-honey-50" : "bg-transparent",
        error ? "bg-terracotta-50" : "",
      ].join(" ")}
    >
      <input
        type="number"
        min={0}
        step="0.5"
        max={assignment.points}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        disabled={isPending}
        aria-label={`Score for ${student.firstName} ${student.lastName}, ${assignment.title}, out of ${assignment.points}`}
        title={error ?? undefined}
        placeholder="—"
        className="w-full h-10 px-2 pr-5 text-center bg-transparent focus:outline-none focus:bg-cream-100 focus:shadow-[inset_0_0_0_1.5px_var(--color-terracotta-400)] disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={onOpenNote}
        className="absolute top-0.5 right-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-sm text-wood-300 hover:text-terracotta-600 hover:bg-cream-200 transition-colors"
        title={cell.note ? "Read/edit note" : "Add a note"}
        aria-label={
          cell.note
            ? `Read or edit the note for ${student.firstName} ${student.lastName}, ${assignment.title}`
            : `Add a note for ${student.firstName} ${student.lastName}, ${assignment.title}`
        }
      >
        {cell.note ? (
          <MessageSquareText className="w-3 h-3 text-honey-600" strokeWidth={2.5} />
        ) : (
          <span className="w-1 h-1 rounded-full bg-transparent" />
        )}
      </button>
    </td>
  );
}
