import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getExamQuestions } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuizRunner } from "@/components/exam-prep/QuizRunner";

export default async function PracticeExamPage() {
  await requireUser();
  const questions = await getExamQuestions();

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
        title="Practice exam"
        description="A full, timed run-through of the whole question bank. Answer everything, then review every question with explanations."
      />

      {questions.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileCheck2}
            title="No questions yet"
            description="The question bank hasn't been loaded yet."
          />
        </Card>
      ) : (
        <QuizRunner questions={questions} mode="exam" />
      )}
    </>
  );
}
