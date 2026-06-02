import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Play,
  CheckCircle2,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AssignmentTypeBadge } from "@/components/assignments/Badges";
import {
  findDemoAssignment,
  DEMO_CODE_SUBMISSION,
  DEMO_TEACHER_FEEDBACK,
} from "@/lib/demo/fixtures";

// Read-only mock of the Monaco code editor used in the real app.
function CodeEditorPanel({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="rounded-cozy-lg overflow-hidden border border-wood-200 shadow-cozy">
      <div className="bg-[#252536] px-4 py-2 flex items-center gap-2 border-b border-black/30">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-terracotta-400" />
          <span className="w-3 h-3 rounded-full bg-honey-400" />
          <span className="w-3 h-3 rounded-full bg-sage-400" />
        </div>
        <p className="text-xs text-wood-300 font-mono ml-2">PlayerController.cs</p>
      </div>
      <div className="bg-[#1e1e2e] text-[#cdd6f4] font-mono text-[0.8rem] leading-relaxed overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="select-none text-right text-[#585b70] px-3 w-10 align-top">
                  {i + 1}
                </td>
                <td className="px-3 whitespace-pre">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function DemoAssignmentDetail({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const a = findDemoAssignment(assignmentId);
  if (!a || !a.published) notFound();

  const isCode = a.type === "code";
  const status = a.viewer.status;

  return (
    <>
      <Link
        href="/demo/student/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-wood-500 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to assignments
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AssignmentTypeBadge type={a.type} />
            <span className="text-xs text-wood-500 inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Due {a.dueDate}
            </span>
          </div>
          <h1 className="font-display text-3xl text-wood-900 leading-tight">
            {a.title}
          </h1>
          <p className="text-wood-500 text-sm mt-1">
            {a.unitTitle} · {a.points} points
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 label-eyebrow mb-2">
          <FileText className="w-3.5 h-3.5" /> Instructions
        </div>
        <p className="text-wood-700 leading-relaxed">{a.instructions}</p>
      </Card>

      {/* Work area */}
      {isCode ? (
        <div className="space-y-3 mb-6">
          <p className="label-eyebrow">Your code</p>
          <CodeEditorPanel code={DEMO_CODE_SUBMISSION} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled>
              <Play className="w-4 h-4" /> Run
            </Button>
            <Button disabled>Turn in</Button>
            <span className="text-xs text-wood-400">
              (disabled in the demo)
            </span>
          </div>
        </div>
      ) : a.type === "unity_upload" ? (
        <Card className="mb-6 border-dashed">
          <div className="text-center py-8">
            <p className="text-wood-700 font-medium">
              Drag your Unity project .zip here
            </p>
            <p className="text-sm text-wood-500 mt-1">
              or click to browse — uploads are disabled in the demo
            </p>
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <p className="label-eyebrow mb-2">Your response</p>
          <div className="rounded-cozy border border-wood-200 bg-cream-50 p-4 text-wood-700 leading-relaxed min-h-[8rem]">
            {status === "graded"
              ? "I'd make a co-op puzzle game where two players each see half the maze and have to describe their side to each other. The core loop is communicate → move → unlock the next room. What makes it special is that neither player can win alone…"
              : "Start typing your answer here…"}
          </div>
        </Card>
      )}

      {/* Status / feedback */}
      {status === "graded" ? (
        <Card className="bg-sage-50 border-sage-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-sage-700" strokeWidth={1.75} />
            <p className="font-display text-lg text-wood-900">
              Graded · {a.viewer.score}/{a.points}
            </p>
          </div>
          {isCode && (
            <div className="flex items-start gap-2 text-sm text-wood-700">
              <MessageSquare className="w-4 h-4 text-sage-600 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{DEMO_TEACHER_FEEDBACK}</p>
            </div>
          )}
        </Card>
      ) : status === "submitted" ? (
        <Card className="bg-cream-100 border-wood-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-honey-700" strokeWidth={1.75} />
            <p className="text-wood-800">
              <span className="font-medium">Submitted</span> — your teacher
              hasn&apos;t graded this yet.
            </p>
          </div>
        </Card>
      ) : status === "draft" ? (
        <Card className="bg-honey-50 border-honey-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-honey-700" strokeWidth={1.75} />
            <p className="text-wood-800">
              <span className="font-medium">Draft saved</span> — not turned in
              yet.
            </p>
          </div>
        </Card>
      ) : null}
    </>
  );
}
