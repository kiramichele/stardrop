import Link from "next/link";
import { ArrowLeft, Code2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCodeExamples } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CodeExamples } from "@/components/exam-prep/CodeExamples";

export default async function CodeExamplesPage() {
  await requireUser();
  const examples = await getCodeExamples();

  return (
    <>
      <Link
        href="/exam-prep"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Exam Prep
      </Link>

      <PageHeader
        eyebrow="Exam Prep"
        title="Code examples"
        description="Annotated C# scripts for the Unity patterns the certification exam expects you to recognize."
      />

      {examples.length === 0 ? (
        <Card>
          <EmptyState
            icon={Code2}
            title="No code examples yet"
            description="The code examples haven't been loaded yet."
          />
        </Card>
      ) : (
        <CodeExamples examples={examples} />
      )}
    </>
  );
}
