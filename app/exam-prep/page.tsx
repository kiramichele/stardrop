import Link from "next/link";
import {
  GraduationCap,
  BookMarked,
  Layers,
  Gamepad2,
  FileCheck2,
  Code2,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getExamPrepCounts, getQuizStats } from "@/lib/exam-prep-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeedContentButton } from "@/components/exam-prep/SeedContentButton";

export default async function ExamPrepHub() {
  const user = await requireUser();
  const [counts, stats] = await Promise.all([
    getExamPrepCounts(),
    getQuizStats(user.id),
  ]);
  const isTeacher = user.role === "teacher";
  const empty =
    counts.terms === 0 && counts.questions === 0 && counts.examples === 0;

  const modes = [
    {
      href: "/exam-prep/glossary",
      icon: BookMarked,
      title: "Glossary",
      desc: "Every key Unity and C# term, clearly defined.",
      count: `${counts.terms} terms`,
      tint: "bg-sage-100 text-sage-700",
    },
    {
      href: "/exam-prep/flashcards",
      icon: Layers,
      title: "Flashcards",
      desc: "Flip through the terms to drill your recall.",
      count: `${counts.terms} cards`,
      tint: "bg-honey-100 text-honey-700",
    },
    {
      href: "/exam-prep/quiz",
      icon: Gamepad2,
      title: "Quick quiz",
      desc: "A fast, gamified round — streaks and instant feedback.",
      count: `${counts.questions} in the bank`,
      tint: "bg-terracotta-100 text-terracotta-700",
    },
    {
      href: "/exam-prep/exam",
      icon: FileCheck2,
      title: "Practice exam",
      desc: "A full, timed run-through with a full answer review.",
      count: `${counts.questions} questions`,
      tint: "bg-wood-200 text-wood-700",
    },
    {
      href: "/exam-prep/code",
      icon: Code2,
      title: "Code examples",
      desc: "Annotated C# scripts for common Unity patterns.",
      count: `${counts.examples} examples`,
      tint: "bg-sage-100 text-sage-700",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Exam Prep"
        title="Unity Certified Associate — Programmer"
        description="Study resources for the certification exam, built for every kind of learner — read, drill, quiz, and practice."
      />

      {empty ? (
        <Card>
          {isTeacher ? (
            <div>
              <CardTitle className="text-lg">
                Set up the study resources
              </CardTitle>
              <CardDescription>
                Load the Unity-cert starter set — glossary terms, exam
                questions, and annotated code examples. Once it&apos;s in, it
                lives in the database, ready to edit and expand.
              </CardDescription>
              <div className="mt-4">
                <SeedContentButton />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={GraduationCap}
              title="Study resources coming soon"
              description="Your teacher hasn't loaded the exam-prep materials yet. Check back shortly!"
            />
          )}
        </Card>
      ) : (
        <>
          {stats.attempts > 0 && (
            <Card className="mb-6 bg-honey-50 border-honey-200">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-honey-100 flex items-center justify-center flex-shrink-0">
                  <Trophy
                    className="w-5 h-5 text-honey-700"
                    strokeWidth={1.75}
                  />
                </div>
                <div className="flex-1">
                  <p className="label-eyebrow text-honey-700">Your best</p>
                  <p className="text-sm text-wood-700 mt-0.5">
                    Quick quiz:{" "}
                    <span className="font-semibold text-wood-900">
                      {stats.quizBest === null
                        ? "—"
                        : `${Math.round(stats.quizBest)}%`}
                    </span>
                    <span className="text-wood-300 mx-2">·</span>
                    Practice exam:{" "}
                    <span className="font-semibold text-wood-900">
                      {stats.examBest === null
                        ? "—"
                        : `${Math.round(stats.examBest)}%`}
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modes.map((m) => (
              <Link key={m.href} href={m.href} className="block">
                <Card hoverable className="h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className={[
                        "w-10 h-10 rounded-cozy flex items-center justify-center flex-shrink-0",
                        m.tint,
                      ].join(" ")}
                    >
                      <m.icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{m.title}</CardTitle>
                      <CardDescription>{m.desc}</CardDescription>
                      <p className="text-xs text-wood-500 mt-2">{m.count}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-wood-400 flex-shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {isTeacher && (
            <p className="text-xs text-wood-400 mt-6">
              Open any section to add, edit, or import content — editing
              controls appear inline for teachers.
            </p>
          )}
        </>
      )}
    </>
  );
}
