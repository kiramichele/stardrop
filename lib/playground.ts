// Client-safe: playground types + the assignment-level CodeRunMode union.
// Server queries / shim live in lib/playground-server.ts.

/** Which run buttons show under a code assignment / in the playground. */
export type CodeRunMode = "none" | "csharp" | "unity" | "both";

export function isCodeRunMode(value: string): value is CodeRunMode {
  return (
    value === "none" || value === "csharp" || value === "unity" || value === "both"
  );
}

export function csharpEnabled(mode: CodeRunMode): boolean {
  return mode === "csharp" || mode === "both";
}

export function unityEnabled(mode: CodeRunMode): boolean {
  return mode === "unity" || mode === "both";
}

/** Labels for the assignment-form select. */
export const CODE_RUN_MODE_LABELS: Record<CodeRunMode, string> = {
  none: "No run buttons (submission-only)",
  csharp: "Only \"Run as C#\"",
  unity: "Only \"Simulate in Unity\"",
  both: "Both — Run as C# and Simulate in Unity",
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

/** Languages the playground / Monaco editor offers. */
export const PLAYGROUND_LANGUAGES: { key: string; label: string }[] = [
  { key: "csharp", label: "C# (Unity)" },
  { key: "javascript", label: "JavaScript" },
  { key: "typescript", label: "TypeScript" },
  { key: "python", label: "Python" },
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "json", label: "JSON" },
  { key: "plaintext", label: "Plain text" },
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
 * Pick a starter for a new code buffer. For C#, choose between the
 * console and Unity templates based on the run mode (assignments) or
 * an explicit choice (playground). Other languages just get an empty
 * buffer for now.
 */
export function starterCodeFor(
  language: string,
  runMode: CodeRunMode = "both"
): string {
  if (language !== "csharp") return "";
  // "csharp" → plain console; everything else (including "both" and
  // "none" — this is a Unity-focused class) → Unity boilerplate.
  if (runMode === "csharp") return CSHARP_CONSOLE_STARTER;
  return CSHARP_UNITY_STARTER;
}
