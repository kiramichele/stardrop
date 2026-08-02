// Server-only: wraps the public Piston API for compiling + running
// student C# code. Default endpoint is community-hosted (free, rate
// limited). Set PISTON_URL in env to point at your own instance.

const DEFAULT_PISTON_URL = "https://emkc.org/api/v2/piston";

function pistonUrl(): string {
  return (process.env.PISTON_URL ?? DEFAULT_PISTON_URL).replace(/\/+$/, "");
}

// Piston's .NET package is C# 9 / .NET 5 — top-level statements work, but there
// are no implicit global usings, so bare `Console.WriteLine(...)` won't compile.
// Prepend the common usings on ONE line so beginner snippets "just work" and
// student line numbers only shift by one (we subtract it back off diagnostics).
const CSHARP_USINGS =
  "using System; using System.Collections.Generic; using System.Linq; using System.Text; using System.Threading.Tasks;";
const CSHARP_PREAMBLE_LINES = 1;

function withUsings(code: string): string {
  return `${CSHARP_USINGS}\n${code}`;
}

/**
 * Turn the .NET SDK's verbose build output into just the student's errors:
 * drop the "Getting ready / Restored / Build FAILED / Time Elapsed" chatter,
 * strip the /box/ sandbox paths + csproj suffix, de-dupe, and shift line
 * numbers back down by the preamble we injected.
 */
function cleanCSharpDiagnostics(raw: string): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(
      /\((\d+),(\d+)\):\s*error\s+(CS\d+):\s*(.+?)(?:\s*\[[^\]]*\])?\s*$/
    );
    if (!m) continue;
    const ln = Math.max(1, parseInt(m[1], 10) - CSHARP_PREAMBLE_LINES);
    const text = `Line ${ln}, col ${m[2]}: ${m[3]}: ${m[4].trim()}`;
    if (!seen.has(text)) {
      seen.add(text);
      out.push(text);
    }
  }
  return out.length > 0 ? out.join("\n") : raw.trim();
}

/** Clean sandbox paths + shift line numbers in a runtime stack trace. */
function cleanCSharpRuntime(raw: string): string {
  return raw
    .replace(/\/box\/submission\//g, "")
    .replace(/main\.cs\.cs/g, "main.cs")
    .replace(
      /:line (\d+)/g,
      (_m, n) => `:line ${Math.max(1, parseInt(n, 10) - CSHARP_PREAMBLE_LINES)}`
    )
    .trim();
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
      headers: {
        "Content-Type": "application/json",
        // Shared secret so a Cloudflare rule can reject anyone but Stardrop.
        // Omitted when unset (e.g. before the tunnel is locked down).
        ...(process.env.PISTON_TOKEN
          ? { "X-Piston-Token": process.env.PISTON_TOKEN }
          : {}),
      },
      body: JSON.stringify({
        language: "csharp.net",
        version: "*",
        files: [{ name: "main.cs", content: withUsings(code) }],
        compile_timeout: 10_000,
        // Piston's default max run_timeout is 3000ms; asking for more is a 400.
        run_timeout: 3_000,
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
    // 401/403 → the configured Piston endpoint is rejecting us (the free
    // emkc.org instance went whitelist-only on 2026-02-15). 429 → rate limit.
    // Make these say "service problem", not "your code is wrong".
    let message: string;
    if (response.status === 401 || response.status === 403) {
      message =
        "The C# code runner isn't set up right now — the free service it used " +
        "became invite-only. Your teacher needs to point Stardrop at a code-" +
        "runner endpoint (PISTON_URL). Your code is fine — this is a server issue.";
    } else if (response.status === 429) {
      message =
        "The code runner is busy (rate limited). Wait a few seconds and try again.";
    } else {
      message = `The code runner is unavailable right now (HTTP ${response.status}). This is a server issue, not your code.`;
    }
    return { ok: false, kind: "transport", message };
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
    // .NET writes CS diagnostics to stdout; clean out the build chatter.
    return {
      ok: false,
      kind: "compile",
      message: "Code didn't compile.",
      stdout: "",
      stderr: cleanCSharpDiagnostics(
        body.compile.stdout ?? body.compile.output ?? body.compile.stderr ?? ""
      ),
    };
  }

  if (body.run.signal === "SIGKILL" || body.run.code === null) {
    return {
      ok: false,
      kind: "timeout",
      message: "Code took too long to run (over 3 seconds) and was stopped.",
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
      stderr: cleanCSharpRuntime(body.run.stderr || body.run.output || ""),
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
