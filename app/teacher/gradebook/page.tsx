import Link from "next/link";
import { Table2 } from "lucide-react";
import { requireFullTeacher } from "@/lib/auth";
import { getClassOptions } from "@/lib/classes-server";
import { getGradeGrid } from "@/lib/grade-grid-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradeGridTable } from "@/components/gradebook/GradeGridTable";

export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  await requireFullTeacher();
  const { class: classParam } = await searchParams;

  const classes = await getClassOptions();
  if (classes.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Teacher"
          title="Gradebook"
          description="An editable, scrolling grade grid — students down the side, assignments across the top."
        />
        <Card>
          <EmptyState
            icon={Table2}
            title="No classes yet"
            description="Create a class first, from the Classes page."
          />
        </Card>
      </>
    );
  }

  const activeClassId =
    classParam && classes.some((c) => c.id === classParam)
      ? classParam
      : classes[0].id;

  const grid = await getGradeGrid(activeClassId);

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Gradebook"
        description="Click a cell to change a score. The small dot means there's a note — click it to read or write one (visible to the student, same as regular feedback)."
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/gradebook?class=${c.id}`}
            className={[
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              c.id === activeClassId
                ? "bg-terracotta-600 text-cream-50"
                : "bg-cream-200 text-wood-700 hover:bg-cream-300",
            ].join(" ")}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {grid.students.length === 0 ? (
        <Card>
          <EmptyState
            icon={Table2}
            title="No students in this class"
            description="Import a roster or move students in from the Classes page."
          />
        </Card>
      ) : grid.assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Table2}
            title="No published assignments yet"
            description="Publish an assignment to this class and it'll show up as a column here."
          />
        </Card>
      ) : (
        <GradeGridTable key={activeClassId} classId={activeClassId} data={grid} />
      )}
    </>
  );
}
