import {
  Check,
  X,
  Sparkles,
  FileText,
  CheckCircle2,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

type Response = {
  id?: string;
  prompt?: string;
  type?: string;
  answer?: string;
  /** Some instruments (e.g. Likert check-ins) store the answer as `value`. */
  value?: string | number;
  correct_answer?: string;
  is_correct?: boolean;
};

type OpenResponse = {
  id?: string;
  prompt?: string;
  value?: string;
  answer?: string;
};

type Shape = {
  responses?: Response[];
  openResponses?: OpenResponse[];
  subscales?: Record<string, number>;
  score?: { earned?: number; max?: number };
};

function asShape(data: unknown): Shape | null {
  if (!data || typeof data !== "object") return null;
  return data as Shape;
}

/** The student's answer, reading either `answer` (quizzes) or `value` (Likert). */
function responseAnswer(r: Response): string {
  if (typeof r.answer === "string" && r.answer.trim() !== "") return r.answer;
  if (r.value !== undefined && r.value !== null && `${r.value}` !== "")
    return String(r.value);
  return "(no answer)";
}

function isValidResponse(r: unknown): r is Response {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.prompt === "string" ||
    typeof obj.answer === "string" ||
    "value" in obj
  );
}

function isValidOpen(r: unknown): r is OpenResponse {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  const text = obj.value ?? obj.answer;
  return typeof obj.prompt === "string" || typeof text === "string";
}

function labelize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function InteractiveResponseView({
  structuredData,
}: {
  structuredData: unknown;
}) {
  const shape = asShape(structuredData);
  const responses = shape?.responses?.filter(isValidResponse) ?? [];
  const openResponses = shape?.openResponses?.filter(isValidOpen) ?? [];
  const subscales =
    shape?.subscales && typeof shape.subscales === "object"
      ? Object.entries(shape.subscales).filter(([, v]) => typeof v === "number")
      : [];
  const score = shape?.score;
  const hasScore =
    score && typeof score.earned === "number" && typeof score.max === "number";

  // Nothing recognizable → show the raw JSON so it's never a black box.
  if (
    responses.length === 0 &&
    openResponses.length === 0 &&
    subscales.length === 0
  ) {
    return (
      <Card padded={false} className="overflow-hidden">
        <p className="label-eyebrow px-4 pt-4">Raw submission data</p>
        <pre className="p-4 text-xs font-mono text-wood-800 overflow-x-auto whitespace-pre-wrap break-all max-h-96">
          {structuredData
            ? JSON.stringify(structuredData, null, 2)
            : "(no data)"}
        </pre>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {hasScore && score && (
        <Card className="bg-honey-50 border-honey-200">
          <div className="flex items-center gap-3">
            <Sparkles
              className="w-5 h-5 text-honey-700 flex-shrink-0"
              strokeWidth={1.75}
            />
            <div>
              <p className="label-eyebrow text-honey-700">Self-graded score</p>
              <p className="font-display text-lg text-wood-900">
                {score.earned} of {score.max} auto-graded questions correct
              </p>
              <p className="text-xs text-wood-600 mt-0.5">
                Use this as a starting point — short-answer questions still need
                manual grading.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Computed subscales (e.g. the check-in's growth-mindset averages). */}
      {subscales.length > 0 && (
        <Card className="bg-sage-50 border-sage-200">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-sage-700" strokeWidth={1.75} />
            <p className="label-eyebrow text-sage-700">Subscale averages</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {subscales.map(([name, val]) => (
              <div
                key={name}
                className="rounded-cozy bg-cream-50 border border-sage-200 px-3 py-2"
              >
                <p className="text-xs text-wood-500">{labelize(name)}</p>
                <p className="font-display text-lg text-wood-900">
                  {Number(val).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Written / open responses — the qualitative answers. */}
      {openResponses.length > 0 && (
        <div className="space-y-2">
          <p className="label-eyebrow inline-flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
            Written responses
          </p>
          {openResponses.map((o, i) => {
            const text = o.value ?? o.answer ?? "";
            return (
              <Card key={o.id ?? `open-${i}`}>
                <p className="font-medium text-wood-900 mb-1">{o.prompt}</p>
                <p
                  className={[
                    "text-sm rounded-cozy px-3 py-2 whitespace-pre-wrap break-words",
                    text.trim()
                      ? "text-wood-900 bg-cream-100 border border-wood-100"
                      : "text-wood-400 italic bg-cream-100 border border-wood-100",
                  ].join(" ")}
                >
                  {text.trim() || "(left blank)"}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scored / multiple-choice / Likert items. */}
      {responses.length > 0 && (
        <div className="space-y-3">
          {openResponses.length > 0 && (
            <p className="label-eyebrow inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              Rated items
            </p>
          )}
          {responses.map((r, i) => {
            const isShort = r.type === "short_answer";
            const hasCorrectness = typeof r.is_correct === "boolean";
            const isCorrect = r.is_correct === true;
            const answer = responseAnswer(r);

            return (
              <Card key={r.id ?? i} className="relative">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={[
                      "w-7 h-7 rounded-cozy flex items-center justify-center flex-shrink-0 text-xs font-display",
                      hasCorrectness
                        ? isCorrect
                          ? "bg-sage-100 text-sage-700"
                          : "bg-terracotta-100 text-terracotta-700"
                        : "bg-cream-200 text-wood-600",
                    ].join(" ")}
                  >
                    {hasCorrectness ? (
                      isCorrect ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="label-eyebrow">
                        {isShort ? "Short answer" : "Question"}
                        {" · "}
                        {i + 1}
                      </p>
                      {hasCorrectness && (
                        <span
                          className={[
                            "text-[0.7rem] font-semibold uppercase tracking-wide-label",
                            isCorrect ? "text-sage-700" : "text-terracotta-700",
                          ].join(" ")}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-wood-900">{r.prompt}</p>
                  </div>
                </div>

                <div className="ml-10 space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText
                        className="w-3 h-3 text-wood-500"
                        strokeWidth={1.75}
                      />
                      <span className="label-eyebrow">Student answer</span>
                    </div>
                    <p
                      className={[
                        "text-sm rounded-cozy px-3 py-2 whitespace-pre-wrap break-words",
                        answer === "(no answer)"
                          ? "text-wood-400 italic bg-cream-100 border border-wood-100"
                          : "text-wood-900 bg-cream-100 border border-wood-100",
                      ].join(" ")}
                    >
                      {answer}
                    </p>
                  </div>

                  {hasCorrectness && !isCorrect && r.correct_answer && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2
                          className="w-3 h-3 text-sage-600"
                          strokeWidth={1.75}
                        />
                        <span className="label-eyebrow text-sage-700">
                          Correct answer
                        </span>
                      </div>
                      <p className="text-sm text-sage-900 rounded-cozy px-3 py-2 bg-sage-50 border border-sage-200">
                        {r.correct_answer}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
