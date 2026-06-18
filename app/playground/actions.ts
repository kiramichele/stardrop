"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { runCSharp, UNITY_SIMULATION_SYSTEM_PROMPT } from "@/lib/code-runner";
import { runAnalysis, isAnthropicConfigured } from "@/lib/anthropic";
import {
  insertProgramRecord,
  updateProgramRecord,
  deleteProgramRecord,
  getProgram,
} from "@/lib/playground-server";

const TITLE_MAX = 120;
const CODE_MAX = 40_000;

/**
 * Unified run result the UI dispatches on. Both modes ultimately resolve
 * to one of these shapes.
 */
export type RunResult =
  | {
      mode: "csharp";
      ok: true;
      stdout: string;
      stderr: string;
    }
  | {
      mode: "csharp";
      ok: false;
      kind: "compile" | "runtime" | "timeout" | "transport";
      message: string;
      stderr?: string;
      stdout?: string;
    }
  | { mode: "unity"; ok: true; narrative: string }
  | { mode: "unity"; ok: false; error: string };

/** Compile + run a snippet (Piston) OR have Claude narrate it. */
export async function runCode(
  code: string,
  mode: "csharp" | "unity"
): Promise<RunResult> {
  await requireUser();
  const clamped = code.slice(0, CODE_MAX);

  if (mode === "csharp") {
    const result = await runCSharp(clamped);
    if (result.ok) {
      return {
        mode: "csharp",
        ok: true,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }
    return {
      mode: "csharp",
      ok: false,
      kind: result.kind,
      message: result.message,
      stderr: result.stderr,
      stdout: result.stdout,
    };
  }

  // mode === "unity"
  if (!isAnthropicConfigured()) {
    return {
      mode: "unity",
      ok: false,
      error:
        "Unity simulation isn't set up on this server (ANTHROPIC_API_KEY missing).",
    };
  }
  if (!clamped.trim()) {
    return { mode: "unity", ok: false, error: "Add some code first." };
  }
  const result = await runAnalysis(UNITY_SIMULATION_SYSTEM_PROMPT, clamped);
  if (!result.ok) return { mode: "unity", ok: false, error: result.error };
  return { mode: "unity", ok: true, narrative: result.text };
}

// =============================================================
// Saved programs
// =============================================================

function sanitize(args: {
  title: string;
  language: string;
  code: string;
}): { title: string; language: string; code: string } | { error: string } {
  const title = args.title.trim().slice(0, TITLE_MAX);
  if (!title) return { error: "Give the program a title." };
  const language = args.language.trim() || "csharp";
  const code = args.code.slice(0, CODE_MAX);
  if (!code.trim()) return { error: "There's no code to save." };
  return { title, language, code };
}

export async function saveProgram(args: {
  title: string;
  language: string;
  code: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const clean = sanitize(args);
  if ("error" in clean) return { ok: false, error: clean.error };
  const result = await insertProgramRecord(user.id, clean);
  if (!result.ok) return result;
  revalidatePath("/playground");
  return { ok: true, id: result.id };
}

export async function updateProgram(
  programId: string,
  args: { title: string; language: string; code: string }
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const clean = sanitize(args);
  if ("error" in clean) return { ok: false, error: clean.error };
  const result = await updateProgramRecord(
    programId,
    user.id,
    user.role === "teacher",
    clean
  );
  if (result.ok) {
    revalidatePath("/playground");
    revalidatePath(`/playground/${programId}`);
  }
  return result;
}

export async function deleteProgram(
  programId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await deleteProgramRecord(
    programId,
    user.id,
    user.role === "teacher"
  );
  if (result.ok) revalidatePath("/playground");
  return result;
}

/**
 * Fork: copy someone else's program (or your own) into a fresh program
 * the current viewer owns. Used by share-link recipients.
 */
export async function forkProgram(
  programId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const source = await getProgram(programId);
  if (!source) return { ok: false, error: "Program not found" };
  const result = await insertProgramRecord(user.id, {
    title: source.title.startsWith("Fork: ")
      ? source.title
      : `Fork: ${source.title}`,
    language: source.language,
    code: source.code,
  });
  if (!result.ok) return result;
  revalidatePath("/playground");
  return { ok: true, id: result.id };
}
