import { highlightCode } from "@/lib/code-highlight";

/**
 * Server-rendered syntax-highlighted code block. Output is Shiki HTML
 * (escaped + styled spans), so we drop it via dangerouslySetInnerHTML.
 *
 * Pass `maxLines` to truncate long code with an indicator — useful in
 * feed cards where we only want a preview.
 */
export async function CodeBlock({
  code,
  language,
  maxLines,
}: {
  code: string;
  language: string;
  maxLines?: number;
}) {
  const lines = code.split("\n");
  const truncated = maxLines && lines.length > maxLines;
  const displayCode = truncated
    ? lines.slice(0, maxLines).join("\n")
    : code;
  const html = await highlightCode(displayCode, language);

  return (
    <div className="rounded-cozy overflow-hidden border border-wood-100 text-sm">
      <div
        className="overflow-x-auto"
        // shiki returns <pre><code>... — themes the background
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {truncated && (
        <p className="border-t border-wood-100 bg-cream-100 px-3 py-1.5 text-[0.7rem] text-wood-500">
          + {lines.length - (maxLines ?? 0)} more lines
        </p>
      )}
    </div>
  );
}
