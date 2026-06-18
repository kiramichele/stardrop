// Server-only: wraps the public Piston API for compiling + running
// student C# code. Default endpoint is community-hosted (free, rate
// limited). Set PISTON_URL in env to point at your own instance.

const DEFAULT_PISTON_URL = "https://emkc.org/api/v2/piston";

function pistonUrl(): string {
  return (process.env.PISTON_URL ?? DEFAULT_PISTON_URL).replace(/\/+$/, "");
}

export type CSharpRunResult =
  | {
      ok: true;
      stdout: string;
      stderr: string;
    }
  | {
      ok: false;
      kind: "compile" | "runtime" | "timeout" | "transport";
      message: string;
      stderr?: string;
      stdout?: string;
    };

/**
 * Compile + run a C# snippet through Piston. Returns a typed result
 * the UI can render — compile errors come back distinct from runtime
 * errors. Bytes are capped on the Piston side (output_max_size); we
 * just trust what comes back and let the caller display it.
 */
export async function runCSharp(code: string): Promise<CSharpRunResult> {
  if (!code.trim()) {
    return { ok: false, kind: "compile", message: "Nothing to run yet." };
  }

  let response: Response;
  try {
    response = await fetch(`${pistonUrl()}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "csharp",
        version: "*",
        files: [{ name: "main.cs", content: code }],
        compile_timeout: 10_000,
        run_timeout: 5_000,
      }),
      // Don't cache.
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      kind: "transport",
      message:
        "Couldn't reach the code runner. Check the connection and try again." +
        (err instanceof Error ? ` (${err.message})` : ""),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      kind: "transport",
      message: `Code runner returned HTTP ${response.status}.`,
    };
  }

  // Piston returns { run, compile? }. Compile is omitted for
  // interpreted languages but present for C#.
  let body: PistonResponse;
  try {
    body = (await response.json()) as PistonResponse;
  } catch {
    return {
      ok: false,
      kind: "transport",
      message: "Code runner returned a response we couldn't parse.",
    };
  }

  if (body.compile && body.compile.code !== 0) {
    return {
      ok: false,
      kind: "compile",
      message: "Code didn't compile.",
      stdout: body.compile.stdout ?? "",
      stderr: body.compile.stderr ?? body.compile.output ?? "",
    };
  }

  if (body.run.signal === "SIGKILL" || body.run.code === null) {
    return {
      ok: false,
      kind: "timeout",
      message: "Code took too long to run (over 5 seconds) and was stopped.",
      stdout: body.run.stdout ?? "",
      stderr: body.run.stderr ?? "",
    };
  }

  if (body.run.code !== 0) {
    return {
      ok: false,
      kind: "runtime",
      message: "Code threw an error while running.",
      stdout: body.run.stdout ?? "",
      stderr: body.run.stderr ?? body.run.output ?? "",
    };
  }

  return {
    ok: true,
    stdout: body.run.stdout ?? "",
    stderr: body.run.stderr ?? "",
  };
}

type PistonStage = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code: number | null;
  signal: string | null;
};
type PistonResponse = {
  language: string;
  version: string;
  run: PistonStage;
  compile?: PistonStage;
};

/**
 * The Anthropic system prompt for "imagine running this in the Unity
 * Editor." Exported so the action layer can re-use it.
 */
export const UNITY_SIMULATION_SYSTEM_PROMPT = `You are a Unity expert helping a student understand their C# script. Imagine they attach the script to a GameObject and press Play in the Unity Editor.

Describe what would happen in plain, encouraging language. Be concrete and chronological:
- What runs on Awake / Start (once)
- What happens each frame in Update / FixedUpdate
- What input handlers fire when triggered
- What state changes and when
- What gets logged to the Console (and what it'd actually print)

If the script isn't a MonoBehaviour, describe what the class does as a regular C# class instead.

If you spot bugs that would cause compile or runtime errors, say so plainly and suggest the fix in one short sentence.

Keep it tight — 2–4 short paragraphs. No bullet lists unless the script has many distinct behaviours that need to be enumerated.`.trim();
