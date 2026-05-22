import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getRubric } from "@/lib/rubrics-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RubricEditor } from "@/components/rubrics/RubricEditor";
import { updateRubric, deleteRubric } from "../actions";

export default async function EditRubricPage({
  params,
}: {
  params: Promise<{ rubricId: string }>;
}) {
  await requireTeacher();
  const { rubricId } = await params;
  const rubric = await getRubric(rubricId);
  if (!rubric) notFound();

  const updateAction = updateRubric.bind(null, rubricId);
  const deleteAction = deleteRubric.bind(null, rubricId);

  return (
    <>
      <Link
        href="/teacher/rubrics"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to rubrics
      </Link>

      <PageHeader
        eyebrow="Rubric"
        title={rubric.name}
        description="Edits apply to future grading. Already-graded submissions keep the scores they were given."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <RubricEditor
            initialName={rubric.name}
            initialCriteria={rubric.criteria}
            action={updateAction}
            submitLabel="Save changes"
          />
        </Card>

        <Card className="border-terracotta-200 bg-terracotta-50/50 h-fit">
          <h3 className="font-display text-base text-terracotta-900 mb-1">
            Danger zone
          </h3>
          <p className="text-xs text-terracotta-800 mb-3">
            Deleting the rubric detaches it from any assignments using it.
            Already-graded submissions keep their stored per-criterion scores.
          </p>
          <form action={deleteAction}>
            <Button type="submit" variant="danger" size="sm" className="w-full">
              Delete rubric
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
