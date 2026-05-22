"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Flame,
  Clock,
  Trophy,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  shuffle,
  scoreBand,
  formatTime,
  QUIZ_LENGTH,
  type ExamQuestion,
  type QuizMode,
} from "@/lib/exam-prep";
import { saveQuizAttempt } from "@/app/exam-prep/actions";

const LETTERS = ["A", "B", "C", "D"];

/**
 * The quiz engine, shared by the gamified quiz and the full practice exam.
 * Quiz mode gives instant per-question feedback and a streak; exam mode
 * defers feedback to a timed review at the end.
 */
export function QuizRunner({
  questions,
  mode,
  bestTime = null,
}: {
  questions: ExamQuestion[];
  mode: QuizMode;
  /** The student's fastest perfect quick-quiz run, in seconds. */
  bestTime?: number | null;
}) {
  function buildRunSet(): ExamQuestion[] {
    const s = shuffle(questions);
    return mode === "quiz" ? s.slice(0, QUIZ_LENGTH) : s;
  }

  const [runSet, setRunSet] = useState<ExamQuestion[]>(buildRunSet);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | undefined>>(
    {}
  );
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<"playing" | "done">("playing");
  const [elapsed, setElapsed] = useState(0);
  const [sessionBest, setSessionBest] = useState<number | null>(bestTime);
  const [newBest, setNewBest] = useState(false);

  const total = runSet.length;
  const score = useMemo(
    () =>
      runSet.reduce(
        (n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0),
        0
      ),
    [runSet, answers]
  );
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < runSet.length; i++) {
      if (answers[i] === undefined) break;
      s = answers[i] === runSet[i].correctIndex ? s + 1 : 0;
    }
    return s;
  }, [runSet, answers]);

  // Count-up timer — runs for both the quick quiz and the practice exam.
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function restart() {
    setRunSet(buildRunSet());
    setCurrent(0);
    setAnswers({});
    setRevealed(false);
    setPhase("playing");
    setElapsed(0);
    setNewBest(false);
  }

  // Finishing records the attempt — done from the action, not an effect.
  function finish() {
    if (total > 0) void saveQuizAttempt(mode, score, total, elapsed);
    // A perfect quick quiz that beats the prior best sets a new record.
    if (
      mode === "quiz" &&
      total > 0 &&
      score === total &&
      (sessionBest === null || elapsed < sessionBest)
    ) {
      setSessionBest(elapsed);
      setNewBest(true);
    }
    setPhase("done");
  }

  function pick(choice: number) {
    if (mode === "quiz" && revealed) return;
    setAnswers((a) => ({ ...a, [current]: choice }));
    if (mode === "quiz") setRevealed(true);
  }

  function next() {
    if (current >= total - 1) {
      finish();
      return;
    }
    setCurrent((c) => c + 1);
    setRevealed(false);
  }

  if (total === 0) return null;

  // ---- Results --------------------------------------------------
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const band = scoreBand(pct);
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <Trophy
            className={[
              "w-12 h-12 mx-auto",
              band.pass ? "text-honey-500" : "text-wood-400",
            ].join(" ")}
            strokeWidth={1.5}
          />
          <p className="font-display text-4xl text-wood-900 mt-3">
            {score} / {total}
          </p>
          <p className="text-lg text-wood-700 mt-1">
            {pct}% · {band.label}
          </p>
          {mode === "exam" && (
            <p className="text-sm text-wood-500 mt-1">
              Finished in {formatTime(elapsed)}
            </p>
          )}
          {mode === "quiz" && (
            <div className="mt-2">
              <p className="text-sm text-wood-500">
                Finished in{" "}
                <span className="font-medium text-wood-700 tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </p>
              {score === total ? (
                newBest ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-honey-700 font-semibold">
                    <Zap className="w-4 h-4" />
                    New best time!
                  </p>
                ) : (
                  sessionBest !== null && (
                    <p className="text-sm text-wood-500 mt-0.5">
                      Your best perfect run:{" "}
                      <span className="tabular-nums">
                        {formatTime(sessionBest)}
                      </span>
                    </p>
                  )
                )
              ) : (
                <p className="text-sm text-wood-500 mt-0.5">
                  Ace all {total} questions to set a best time.
                </p>
              )}
            </div>
          )}
          <div className="mt-5">
            <Button onClick={restart}>
              <RotateCw className="w-4 h-4" />
              {mode === "exam" ? "Take it again" : "Play again"}
            </Button>
          </div>
        </Card>

        {mode === "exam" && (
          <div className="mt-6 space-y-3">
            <h2 className="font-display text-xl text-wood-800">
              Review every question
            </h2>
            {runSet.map((q, i) => {
              const picked = answers[i];
              const right = picked === q.correctIndex;
              return (
                <Card key={q.id}>
                  <div className="flex items-start gap-2">
                    {right ? (
                      <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-terracotta-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-wood-900">
                        {i + 1}. {q.question}
                      </p>
                      {q.code && (
                        <pre className="mt-1.5 bg-cream-100 border border-wood-200 rounded-cozy p-2.5 overflow-x-auto text-xs font-mono text-wood-900 leading-relaxed">
                          {q.code}
                        </pre>
                      )}
                      <p className="text-sm mt-1.5 text-sage-700">
                        Correct: {LETTERS[q.correctIndex]}){" "}
                        {q.choices[q.correctIndex]}
                      </p>
                      {picked !== undefined && !right && (
                        <p className="text-sm text-terracotta-700">
                          You chose: {LETTERS[picked]} {q.choices[picked]}
                        </p>
                      )}
                      {picked === undefined && (
                        <p className="text-sm text-wood-500">Left blank</p>
                      )}
                      {q.explanation && (
                        <p className="text-sm text-wood-600 mt-1.5 leading-relaxed">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Playing --------------------------------------------------
  const q = runSet[current];
  const picked = answers[current];
  const progressPct = ((current + (revealed ? 1 : 0)) / total) * 100;

  function choiceClass(i: number): string {
    const base =
      "w-full text-left px-4 py-3 rounded-cozy border transition-colors flex items-start gap-3 disabled:cursor-default";
    if (mode === "quiz" && revealed) {
      if (i === q.correctIndex)
        return `${base} border-sage-300 bg-sage-50 text-sage-900`;
      if (i === picked)
        return `${base} border-terracotta-300 bg-terracotta-50 text-terracotta-900`;
      return `${base} border-wood-100 bg-cream-50 text-wood-400`;
    }
    if (picked === i)
      return `${base} border-terracotta-400 bg-terracotta-50 text-wood-900`;
    return `${base} border-wood-200 bg-cream-50 text-wood-800 hover:border-terracotta-300 hover:bg-cream-100`;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-wood-500 tabular-nums">
          Question {current + 1} of {total}
        </span>
        {mode === "quiz" ? (
          <span className="flex items-center gap-3">
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 text-honey-700 font-medium">
                <Flame className="w-4 h-4" />
                {streak} streak
              </span>
            )}
            <span className="text-wood-700 font-medium tabular-nums">
              {score} correct
            </span>
            <span className="inline-flex items-center gap-1 text-wood-500 tabular-nums">
              <Clock className="w-4 h-4" />
              {formatTime(elapsed)}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-wood-500 tabular-nums">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      <div className="h-2 rounded-full bg-wood-100 overflow-hidden mb-5">
        <div
          className="h-full rounded-full bg-terracotta-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <Card>
        <p className="label-eyebrow text-wood-400 mb-2">{q.category}</p>
        <p className="font-display text-xl text-wood-900 mb-4">{q.question}</p>

        {q.code && (
          <pre className="mb-4 bg-cream-100 border border-wood-200 rounded-cozy p-3 overflow-x-auto text-sm font-mono text-wood-900 leading-relaxed">
            {q.code}
          </pre>
        )}

        <div className="space-y-2">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={mode === "quiz" && revealed}
              className={choiceClass(i)}
            >
              <span className="font-semibold flex-shrink-0">{LETTERS[i]}</span>
              <span className="flex-1">{choice}</span>
              {mode === "quiz" && revealed && i === q.correctIndex && (
                <CheckCircle2 className="w-4 h-4 text-sage-600 flex-shrink-0" />
              )}
              {mode === "quiz" &&
                revealed &&
                i === picked &&
                i !== q.correctIndex && (
                  <XCircle className="w-4 h-4 text-terracotta-600 flex-shrink-0" />
                )}
            </button>
          ))}
        </div>

        {mode === "quiz" && revealed && (
          <div
            className={[
              "mt-4 rounded-cozy border px-3 py-2.5 text-sm",
              picked === q.correctIndex
                ? "border-sage-200 bg-sage-50 text-sage-900"
                : "border-honey-200 bg-honey-50 text-honey-900",
            ].join(" ")}
          >
            <p className="font-medium mb-0.5">
              {picked === q.correctIndex ? "Correct!" : "Not quite."}
            </p>
            {q.explanation && (
              <p className="leading-relaxed">{q.explanation}</p>
            )}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-4">
        {mode === "exam" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCurrent((c) => Math.max(0, c - 1));
              setRevealed(false);
            }}
            disabled={current === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <span />
        )}

        {mode === "quiz" ? (
          <Button onClick={next} disabled={!revealed}>
            {current >= total - 1 ? "See results" : "Next question"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : current >= total - 1 ? (
          <Button onClick={finish}>Finish exam</Button>
        ) : (
          <Button onClick={next}>
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
