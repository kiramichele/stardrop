import {
  Code2,
  FileText,
  MessagesSquare,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  Award,
} from "lucide-react";
import type { AssignmentType } from "@/lib/assignments";

const typeMeta: Record<
  AssignmentType,
  { icon: typeof Code2; label: string; tint: string }
> = {
  code: {
    icon: Code2,
    label: "Code",
    tint: "bg-terracotta-100 text-terracotta-800",
  },
  written: {
    icon: FileText,
    label: "Written",
    tint: "bg-sage-100 text-sage-800",
  },
  discussion: {
    icon: MessagesSquare,
    label: "Discussion",
    tint: "bg-wood-100 text-wood-800",
  },
  upload: {
    icon: Upload,
    label: "Upload",
    tint: "bg-cream-300 text-wood-800",
  },
};

export function AssignmentTypeBadge({ type }: { type: AssignmentType }) {
  const meta = typeMeta[type];
  const Icon = meta.icon;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-cozy text-[0.7rem] font-semibold uppercase tracking-wide-label",
        meta.tint,
      ].join(" ")}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      {meta.label}
    </span>
  );
}

type StatusInput = {
  status?: "draft" | "submitted" | "graded" | null;
  hasGrade?: boolean;
  isLate?: boolean;
};

export function SubmissionStatusBadge({
  status,
  hasGrade,
  isLate,
}: StatusInput) {
  if (hasGrade || status === "graded") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
        <Award className="w-3 h-3" /> Graded
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span
        className={[
          "inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label",
          isLate ? "text-terracotta-700" : "text-sage-700",
        ].join(" ")}
      >
        {isLate ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <CheckCircle2 className="w-3 h-3" />
        )}
        {isLate ? "Submitted late" : "Submitted"}
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-honey-700">
        <Clock className="w-3 h-3" /> Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
      Not started
    </span>
  );
}

export function PublishBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-sage-700">
      <Eye className="w-3 h-3" /> Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-400">
      <EyeOff className="w-3 h-3" /> Draft
    </span>
  );
}
