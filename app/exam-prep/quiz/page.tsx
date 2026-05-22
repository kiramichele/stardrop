import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getExamQuestions } from "@/lib/exam-prep-server";
import { QUIZ_LENGTH } from "@/lib/exam-prep";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuizRunner } from "@/components/exam-prep/QuizRunner";
import { QuestionManager } from "@/components/exam-prep/QuestionManager";

export default async function QuizPage() {
  const user = await requireUser();
  const questions = await getExamQuestions();
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
        title={isTeacher ? "Quick quiz — question bank" : "Quick quiz"}
        description={
          isTeacher
            ? "Add, edit, and import the questions students are quizzed on. These also feed the practice exam."
            : `A gamified ${QUIZ_LENGTH}-question round — pick an answer, get instant feedback, build a streak.`
        }
      />

      {isTeacher ? (
        <QuestionManager questions={questions} />
      ) : questions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Gamepad2}
            title="No questions yet"
            description="The question bank hasn't been loaded yet."
          />
        </Card>
      ) : (
        <QuizRunner questions={questions} mode="quiz" />
      )}
    </>
  );
}
