import { Clipboard } from "lucide-react";
import type { SubmissionEvent } from "@/lib/assignments";

interface PasteTimelineProps {
  events: SubmissionEvent[];
  totalContentLength: number;
}

export function PasteTimeline({ events, totalContentLength }: PasteTimelineProps) {
  const pasteEvents = events.filter((e) => e.event_type === "paste");
  const totalPasted = pasteEvents.reduce(
    (sum, e) => sum + (Number(e.payload?.length) || 0),
    0
  );
  const pasteRatio =
    totalContentLength > 0
      ? Math.round((totalPasted / totalContentLength) * 100)
      : 0;

  if (pasteEvents.length === 0) {
    return (
      <div className="text-sm text-wood-500 italic">
        No paste events recorded — all typed.
      </div>
    );
  }

  const ratioColor =
    pasteRatio > 60
      ? "bg-terracotta-500"
      : pasteRatio > 30
        ? "bg-honey-500"
        : "bg-sage-500";

  const ratioTextColor =
    pasteRatio > 60
      ? "text-terracotta-700"
      : pasteRatio > 30
        ? "text-honey-700"
        : "text-sage-700";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="label-eyebrow">Paste ratio</p>
          <p className={["font-display text-2xl", ratioTextColor].join(" ")}>
            {pasteRatio}%
          </p>
        </div>
        <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={["h-full transition-all duration-300", ratioColor].join(" ")}
            style={{ width: `${Math.min(pasteRatio, 100)}%` }}
          />
        </div>
        <p className="text-xs text-wood-500 mt-2">
          {pasteEvents.length} paste{pasteEvents.length === 1 ? "" : "s"} ·{" "}
          {totalPasted} chars pasted of {totalContentLength} total
        </p>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Timeline</p>
        <ol className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {pasteEvents.map((event, i) => {
            const length = Number(event.payload?.length) || 0;
            const content = String(event.payload?.content ?? "");
            return (
              <li
                key={event.id}
                className="text-xs bg-cream-100 rounded-cozy p-2"
              >
                <div className="flex items-center justify-between text-wood-500 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[0.65rem] text-wood-400">
                      #{i + 1}
                    </span>
                    <Clipboard className="w-3 h-3" />
                    <span>{length} chars</span>
                  </span>
                  <span className="font-mono text-[0.65rem]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="font-mono text-wood-700 line-clamp-3 whitespace-pre-wrap break-all">
                  {content}
                </pre>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}