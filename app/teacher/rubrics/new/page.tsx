import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { RubricEditor } from "@/components/rubrics/RubricEditor";
import { createRubric } from "../actions";

export default async function NewRubricPage() {
  await requireTeacher();

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
        eyebrow="New rubric"
        title="Create a rubric"
        description="Add a criterion for each thing you'll score. You can edit, rename, or delete the rubric later."
      />

      <Card className="max-w-3xl">
        <RubricEditor
          initialName=""
          initialCriteria={[]}
          action={createRubric}
          submitLabel="Create rubric"
        />
      </Card>
    </>
  );
}
