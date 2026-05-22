import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGlossaryTerms } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlossaryList } from "@/components/exam-prep/GlossaryList";

export default async function GlossaryPage() {
  const user = await requireUser();
  const terms = await getGlossaryTerms();
  const isTeacher = user.role === "teacher";

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
        title="Glossary"
        description={
          isTeacher
            ? "Every key Unity and C# term. Add, edit, or import terms in bulk from a CSV."
            : "Every key Unity and C# term you need for the certification exam, defined plainly."
        }
      />

      <GlossaryList terms={terms} isTeacher={isTeacher} />
    </>
  );
}
