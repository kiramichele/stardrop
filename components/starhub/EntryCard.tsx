import Link from "next/link";
import {
  Code2,
  Video,
  FileText,
  MessagesSquare,
  Sparkles,
  Gamepad2,
  Upload,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  submissionMediaUrl,
  type AssignmentType,
} from "@/lib/assignments";
import {
  formatStarHubDate,
  type PortfolioEntry,
} from "@/lib/starhub";
import { CodeBlock } from "./CodeBlock";
import { EntryVisibilityChip } from "./EntryVisibilityChip";
import { GistDeleteButton } from "./GistDeleteButton";

/**
 * Dispatches on entry.kind + (for submissions) assignmentType to render
 * the right preview. Server-rendered so shiki can highlight code on the
 * server with no client JS for syntax highlighting.
 */
export async function EntryCard({
  entry,
  isOwner,
  isTeacher,
}: {
  entry: PortfolioEntry;
  isOwner: boolean;
  isTeacher: boolean;
}) {
  const canManage = isOwner || isTeacher;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <EntryHeader entry={entry} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <EntryVisibilityChip
            target={
              entry.kind === "gist"
                ? { kind: "gist", id: entry.id }
                : entry.kind === "submission"
                  ? { kind: "submission", id: entry.id }
                  : { kind: "submission", id: entry.id } // showcase: not toggleable here
            }
            initialIsPublic={entry.isPublic}
            canManage={canManage && entry.kind !== "showcase"}
          />
        </div>
      </div>

      {await renderBody(entry)}

      {canManage && entry.kind === "gist" && (
        <div className="flex items-center justify-between gap-2 border-t border-wood-100 px-4 py-2">
          <Link
            href={`/starhub/gists/${entry.id}/edit`}
            className="text-xs text-wood-500 hover:text-terracotta-700"
          >
            Edit
          </Link>
          <GistDeleteButton gistId={entry.id} />
        </div>
      )}
    </Card>
  );
}

function EntryHeader({ entry }: { entry: PortfolioEntry }) {
  const Icon = entryIcon(entry);
  const kindLabel = entryKindLabel(entry);
  return (
    <>
      <p className="label-eyebrow flex items-center gap-1.5">
        <Icon className="h-3 w-3" strokeWidth={2} />
        {kindLabel}
        <span className="text-wood-400">· {formatStarHubDate(entry.createdAt)}</span>
      </p>
      <h3 className="mt-1 font-display text-lg text-wood-900 leading-snug">
        {entry.title}
      </h3>
      {entry.kind === "gist" && entry.description && (
        <p className="mt-1 text-sm text-wood-600">{entry.description}</p>
      )}
      {entry.kind === "showcase" && entry.description && (
        <p className="mt-1 text-sm text-wood-600 line-clamp-2">
          {entry.description}
        </p>
      )}
    </>
  );
}

async function renderBody(entry: PortfolioEntry) {
  if (entry.kind === "gist") {
    return (
      <div className="px-4 pb-4">
        <CodeBlock
          code={entry.code}
          language={entry.language}
          maxLines={24}
        />
      </div>
    );
  }

  if (entry.kind === "showcase") {
    return (
      <div className="px-4 pb-4">
        {entry.thumbnailPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicShowcaseThumb(entry.thumbnailPath)}
            alt=""
            className="w-full max-h-[280px] object-cover rounded-cozy bg-cream-100"
          />
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center rounded-cozy bg-gradient-to-br from-terracotta-100 to-honey-100">
            <Gamepad2 className="h-10 w-10 text-terracotta-300" strokeWidth={1.5} />
          </div>
        )}
        <div className="mt-3">
          <Link
            href={`/showcase/${entry.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:text-terracotta-800"
          >
            Open in Showcase
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // entry.kind === "submission"
  const type = entry.assignmentType as AssignmentType;

  if (type === "code") {
    return (
      <div className="px-4 pb-4">
        {entry.content && entry.content.trim().length > 0 ? (
          <CodeBlock code={entry.content} language="csharp" maxLines={24} />
        ) : (
          <p className="text-sm text-wood-500 italic">No code submitted.</p>
        )}
        <SubmissionFooter entry={entry} />
      </div>
    );
  }

  if (type === "devlog" || type === "video_response") {
    const video = entry.uploadedFiles.find((m) => m.kind === "video");
    return (
      <div className="px-4 pb-4">
        {video ? (
          <video
            src={submissionMediaUrl(video)}
            controls
            preload="metadata"
            className="w-full max-h-[420px] rounded-cozy bg-black"
          />
        ) : (
          <p className="text-sm text-wood-500 italic">No video uploaded.</p>
        )}
        <SubmissionFooter entry={entry} />
      </div>
    );
  }

  if (type === "short_answer" || type === "discussion") {
    return (
      <div className="px-4 pb-4">
        <p className="whitespace-pre-wrap text-sm text-wood-700 leading-relaxed line-clamp-8">
          {entry.content?.trim() || "—"}
        </p>
        <SubmissionFooter entry={entry} />
      </div>
    );
  }

  if (type === "unity_upload") {
    return (
      <div className="px-4 pb-4">
        {entry.uploadedFiles.length === 0 ? (
          <p className="text-sm text-wood-500 italic">No files uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entry.uploadedFiles.slice(0, 6).map((m) => (
              <a
                key={m.id}
                href={submissionMediaUrl(m)}
                target="_blank"
                rel="noreferrer"
                className="block aspect-video rounded-cozy bg-cream-100 overflow-hidden"
              >
                {m.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={submissionMediaUrl(m)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={submissionMediaUrl(m)}
                    className="h-full w-full object-cover"
                    preload="metadata"
                    muted
                  />
                )}
              </a>
            ))}
          </div>
        )}
        <SubmissionFooter entry={entry} />
      </div>
    );
  }

  if (type === "interactive_html") {
    const scoreChip =
      entry.score !== null && entry.maxPoints > 0
        ? `${entry.score} / ${entry.maxPoints}`
        : null;
    return (
      <div className="px-4 pb-4">
        <Link
          href={`/student/assignments/${entry.assignmentId}`}
          className="inline-flex items-center gap-2 rounded-cozy bg-cream-100 px-3 py-2 text-sm text-wood-700 hover:bg-cream-200 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open the activity
          {scoreChip && (
            <span className="ml-1 rounded-full bg-honey-100 px-2 py-0.5 text-[0.65rem] font-semibold text-honey-800">
              {scoreChip}
            </span>
          )}
        </Link>
        <SubmissionFooter entry={entry} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <p className="text-sm text-wood-500 italic">
        This submission type doesn&apos;t render on the StarHub yet.
      </p>
      <SubmissionFooter entry={entry} />
    </div>
  );
}

function SubmissionFooter({
  entry,
}: {
  entry: Extract<PortfolioEntry, { kind: "submission" }>;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-wood-500">
      <Link
        href={`/student/assignments/${entry.assignmentId}`}
        className="hover:text-terracotta-700 transition-colors"
      >
        From assignment →
      </Link>
      {entry.score !== null && entry.maxPoints > 0 && (
        <span className="rounded-full bg-honey-100 px-2 py-0.5 text-[0.65rem] font-semibold text-honey-800">
          Graded · {entry.score} / {entry.maxPoints}
        </span>
      )}
    </div>
  );
}

function entryIcon(entry: PortfolioEntry) {
  if (entry.kind === "gist") return Code2;
  if (entry.kind === "showcase") return Gamepad2;
  switch (entry.assignmentType) {
    case "code":
      return Code2;
    case "devlog":
    case "video_response":
      return Video;
    case "short_answer":
      return FileText;
    case "discussion":
      return MessagesSquare;
    case "interactive_html":
      return Sparkles;
    case "unity_upload":
      return Upload;
    default:
      return FileText;
  }
}

function entryKindLabel(entry: PortfolioEntry): string {
  if (entry.kind === "gist") return "Gist";
  if (entry.kind === "showcase") return "Showcase project";
  switch (entry.assignmentType) {
    case "code":
      return "Code submission";
    case "devlog":
      return "Devlog";
    case "video_response":
      return "Video response";
    case "short_answer":
      return "Short answer";
    case "discussion":
      return "Discussion post";
    case "interactive_html":
      return "Interactive activity";
    case "unity_upload":
      return "Unity project";
    default:
      return "Submission";
  }
}

function publicShowcaseThumb(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/showcase/${path}`;
}
