import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from "shiki";

// Server-only: syntax-highlights a code string to HTML using Shiki.
// We cache one Highlighter instance per server module load (warm after
// the first request). The cool/light VS Code theme harmonises with the
// new tech palette (light surfaces, deep navy text, emerald accents).

const LANGS: BundledLanguage[] = [
  "csharp",
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "json",
  "hlsl",
];

let _highlighter: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!_highlighter) {
    _highlighter = createHighlighter({
      themes: ["github-light"],
      langs: LANGS,
    });
  }
  return _highlighter;
}

const LANG_ALIASES: Record<string, BundledLanguage> = {
  cs: "csharp",
  c_sharp: "csharp",
  shader: "hlsl",
  plaintext: "csharp", // shiki will still render — language doesn't really matter
  text: "csharp",
};

function resolveLang(lang: string): BundledLanguage {
  const lowered = lang.toLowerCase();
  if (LANG_ALIASES[lowered]) return LANG_ALIASES[lowered];
  if ((LANGS as readonly string[]).includes(lowered)) {
    return lowered as BundledLanguage;
  }
  return "csharp";
}

/**
 * Render a code string as syntax-highlighted HTML. The returned HTML
 * goes through `dangerouslySetInnerHTML` (Shiki escapes content; the
 * tags themselves are styled spans).
 */
export async function highlightCode(
  code: string,
  language: string
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: resolveLang(language),
    theme: "github-light",
  });
}
