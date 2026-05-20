import Anthropic from "@anthropic-ai/sdk";

/**
 * Thin Claude wrapper for the analytics "what are they struggling with"
 * feature. No-ops cleanly when ANTHROPIC_API_KEY isn't set, so the rest
 * of the analytics dashboard works without it.
 *
 * Required env var (add to .env.local):
 *   ANTHROPIC_API_KEY
 */

let _client: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic();
  return _client;
}

export type AnalysisResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Run one analysis prompt through Claude and return the plain-text result.
 * Used for both the per-assignment and per-student struggle analyses.
 */
export async function runAnalysis(
  system: string,
  userContent: string
): Promise<AnalysisResult> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      error:
        "AI analysis isn't set up yet — add ANTHROPIC_API_KEY to .env.local and restart the server.",
    };
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return { ok: false, error: "The model returned an empty analysis." };
    }
    return { ok: true, text };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `Anthropic API error (${err.status ?? "?"}): ${err.message}`,
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Analysis failed.",
    };
  }
}
