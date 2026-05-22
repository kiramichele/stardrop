import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getGlossaryTerms } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Flashcards } from "@/components/exam-prep/Flashcards";

export default async function FlashcardsPage() {
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
        title="Flashcards"
        description="Flip through the terms to drill your recall. Shuffle for a fresh order any time."
      />

      {terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={Layers}
            title="No flashcards yet"
            description="The term set hasn't been loaded yet."
          />
        </Card>
      ) : (
        <Flashcards terms={terms} />
      )}
    </>
  );
}
