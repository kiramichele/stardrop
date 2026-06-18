// Client-safe: playground types + the assignment-level CodeRunMode union.
// Server queries / shim live in lib/playground-server.ts.

/**
 * Which run button shows under a code assignment / in the playground.
 *
 * "both" is a legacy value from an earlier two-button design — when we
 * see it in the database, we resolve it to "unity" (this is a Unity-
 * focused class). It's no longer offered as a form option.
 */
export type CodeRunMode = "none" | "csharp" | "unity" | "both";

export function isCodeRunMode(value: string): value is CodeRunMode {
  return (
    value === "none" || value === "csharp" || value === "unity" || value === "both"
  );
}

/** What kind of run button the UI should show. null = no button. */
export type RunAs = "csharp" | "unity";

/** Map a stored CodeRunMode to the single run action it produces. */
export function resolveRunAs(mode: CodeRunMode): RunAs | null {
  if (mode === "none") return null;
  if (mode === "csharp") return "csharp";
  return "unity"; // "unity" or legacy "both"
}

/** Labels for the assignment-form select (the only 3 we offer now). */
export const CODE_RUN_MODE_LABELS: Record<
  Exclude<CodeRunMode, "both">,
  string
> = {
  none: "No run button (submission-only)",
  csharp: "Run as C#",
  unity: "Simulate in Unity",
};

/** A row from playground_programs. */
export type PlaygroundProgram = {
  id: string;
  user_id: string;
  title: string;
  language: string;
  code: string;
  created_at: string;
  updated_at: string;
};

/**
 * Languages the playground / Monaco editor offers.
 *
 * Two flavours of C# — the underlying Monaco / Shiki / Piston language
 * is plain "csharp" for both. The split is purely UX: "C#" defaults to
 * the console boilerplate, "C# (Unity)" defaults to the MonoBehaviour
 * one. Stored on programs.language so the sidebar pill can show which
 * flavour the student chose.
 */
export const PLAYGROUND_LANGUAGES: { key: string; label: string }[] = [
  { key: "csharp", label: "C#" },
  { key: "csharp_unity", label: "C# (Unity)" },
];

// =============================================================
// Starter templates
// =============================================================

/** Plain console C# — used when the run mode is "csharp" only. */
export const CSHARP_CONSOLE_STARTER = `using System;

class Program
{
    static void Main()
    {
        // your code goes here
    }
}
`;

/** Unity MonoBehaviour boilerplate — Start + Update lifecycle. */
export const CSHARP_UNITY_STARTER = `using UnityEngine;

public class NewBehaviourScript : MonoBehaviour
{
    // Start is called once before the first frame update
    void Start()
    {
        // runs once when the GameObject is loaded
    }

    // Update is called once per frame
    void Update()
    {
        // runs every frame while the GameObject is enabled
    }
}
`;

/**
 * Pick a starter for a new code buffer. The playground language key
 * decides first (csharp → console, csharp_unity → Unity); otherwise we
 * fall back to the assignment's run mode.
 */
export function starterCodeFor(
  language: string,
  runMode: CodeRunMode = "both"
): string {
  if (language === "csharp_unity") return CSHARP_UNITY_STARTER;
  if (language !== "csharp") return "";
  // language === "csharp" (plain console flavour OR an assignment, which
  // doesn't have a language picker). Run mode decides for assignments.
  if (runMode === "csharp") return CSHARP_CONSOLE_STARTER;
  return CSHARP_UNITY_STARTER;
}
