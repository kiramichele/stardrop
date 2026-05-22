import Link from "next/link";
import { ClipboardCheck, Plus, ArrowRight } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getRubricsForTeacher } from "@/lib/rubrics-server";
import { rubricMaxPoints } from "@/lib/rubrics";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TeacherRubricsPage() {
  await requireTeacher();
  const rubrics = await getRubricsForTeacher();

  return (
    <>
      <PageHeader
        eyebrow="Grading"
        title="Rubrics"
        description="Define criteria once, reuse across any assignment. Each criterion has its own point value; the total auto-sums during grading."
        action={
          <Link href="/teacher/rubrics/new">
            <Button>
              <Plus className="w-4 h-4" strokeWidth={2} />
              New rubric
            </Button>
          </Link>
        }
      />

      {rubrics.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No rubrics yet"
            description="Create your first rubric. You'll be able to attach it to any assignment from the assignment's settings panel."
            action={
              <Link href="/teacher/rubrics/new">
                <Button>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create your first rubric
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {rubrics.map((r) => (
              <li key={r.id} className="p-1.5">
                <Link
                  href={`/teacher/rubrics/${r.id}`}
                  className="group flex items-center gap-4 px-3 py-3 rounded-cozy hover:bg-cream-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-wood-900">{r.name}</p>
                    <p className="text-xs text-wood-500 mt-0.5">
                      {r.criteria.length}{" "}
                      {r.criteria.length === 1 ? "criterion" : "criteria"} ·{" "}
                      {rubricMaxPoints(r.criteria)} pts total
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-wood-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
