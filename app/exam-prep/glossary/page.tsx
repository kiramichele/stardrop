import Link from "next/link";
import { ArrowLeft, BookMarked } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGlossaryTerms } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function GlossaryPage() {
  await requireUser();
  const terms = await getGlossaryTerms();

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
        description="Every key Unity and C# term you need for the certification exam, defined plainly."
      />

      {terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookMarked}
            title="No terms yet"
            description="The glossary hasn't been loaded yet."
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {terms.map((t) => (
              <li key={t.id} className="px-5 py-3.5">
                <p className="font-display text-base text-wood-900">
                  {t.term}
                </p>
                <p className="text-sm text-wood-600 mt-0.5 leading-relaxed">
                  {t.definition}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
