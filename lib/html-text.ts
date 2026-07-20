/**
 * Extract readable plain text from a lesson HTML document, server-side, for
 * text-to-speech. Lesson HTML is teacher-uploaded static markup, so a
 * lightweight strip (no DOM parser dependency) is enough:
 *   - drop <script>, <style>, <head>, and HTML comments entirely
 *   - turn block-level tags into paragraph/line breaks so the reader pauses
 *   - strip remaining tags and decode the common named/numeric entities
 *   - collapse runaway whitespace
 *
 * This mirrors the text a browser would read aloud from the same page; it
 * is intentionally forgiving rather than a spec-complete HTML parser.
 */
export function htmlToText(html: string): string {
  let s = html;

  // Remove chunks whose contents should never be read.
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<head\b[\s\S]*?<\/head>/gi, "");
  s = s.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "");

  // Block boundaries -> paragraph breaks so sentences don't run together.
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|tr|blockquote)\s*>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // Everything else: drop the tag.
  s = s.replace(/<[^>]+>/g, "");

  // Decode the handful of entities that actually show up in lesson copy.
  s = decodeEntities(s);

  // Normalize whitespace: collapse spaces, cap consecutive blank lines.
  s = s
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    copy: "©",
    reg: "®",
    trade: "™",
  };
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[body] ?? match;
  });
}
