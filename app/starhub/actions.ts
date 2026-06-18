"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  insertGistRecord,
  updateGistRecord,
  deleteGistRecord,
  getGist,
} from "@/lib/starhub-server";
import { setSubmissionPublicRecord } from "@/lib/devlog-wall-server";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;
const CODE_MAX = 40000;
const LANGS = new Set([
  "csharp",
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "json",
  "shader",
  "plaintext",
]);

function sanitizeMeta(args: {
  title: string;
  description: string;
  language: string;
  code: string;
}): { title: string; description: string | null; language: string; code: string } | { error: string } {
  const title = args.title.trim().slice(0, TITLE_MAX);
  if (!title) return { error: "Give the gist a title." };
  const description =
    args.description.trim().slice(0, DESCRIPTION_MAX) || null;
  const language = LANGS.has(args.language) ? args.language : "csharp";
  const code = args.code.slice(0, CODE_MAX);
  if (!code.trim()) return { error: "Add some code to your gist." };
  return { title, description, language, code };
}

/** Create a new portfolio gist. */
export async function createGist(args: {
  title: string;
  description: string;
  language: string;
  code: string;
  isPublic: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const meta = sanitizeMeta(args);
  if ("error" in meta) return { ok: false, error: meta.error };

  const result = await insertGistRecord(user.id, {
    title: meta.title,
    description: meta.description,
    language: meta.language,
    code: meta.code,
    isPublic: args.isPublic,
  });
  if (!result.ok) return result;

  revalidatePath(`/starhub/${user.username}`);
  return { ok: true, id: result.id };
}

/** Update an existing gist. Owner or teacher only. */
export async function updateGist(
  gistId: string,
  args: {
    title: string;
    description: string;
    language: string;
    code: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const meta = sanitizeMeta(args);
  if ("error" in meta) return { ok: false, error: meta.error };

  const existing = await getGist(gistId);
  if (!existing) return { ok: false, error: "Gist not found" };

  const result = await updateGistRecord(
    gistId,
    user.id,
    user.role === "teacher",
    {
      title: meta.title,
      description: meta.description,
      language: meta.language,
      code: meta.code,
    }
  );
  if (!result.ok) return result;

  // Use the owner's username for revalidation, not the actor's
  // (teacher editing a student's gist).
  const username = await usernameFor(existing.user_id);
  if (username) revalidatePath(`/starhub/${username}`);
  return { ok: true };
}

/** Delete a gist. Owner or teacher only. */
export async function deleteGist(
  gistId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await deleteGistRecord(
    gistId,
    user.id,
    user.role === "teacher"
  );
  if (!result.ok) return result;
  if (result.userId) {
    const username = await usernameFor(result.userId);
    if (username) revalidatePath(`/starhub/${username}`);
  }
  return { ok: true };
}

/** Owner-flip a gist's public/private state. */
export async function setGistPublic(
  gistId: string,
  isPublic: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const existing = await getGist(gistId);
  if (!existing) return { ok: false, error: "Gist not found" };

  const result = await updateGistRecord(
    gistId,
    user.id,
    user.role === "teacher",
    { is_public: isPublic }
  );
  if (!result.ok) return result;

  const username = await usernameFor(existing.user_id);
  if (username) revalidatePath(`/starhub/${username}`);
  return { ok: true };
}

/**
 * Flip a SUBMISSION's public/private state from the StarHub page.
 * Reuses the same authoritative helper as the devlog wall — it owns
 * the video-consent guard so a teacher can't publish a video for a
 * student.
 */
export async function setSubmissionVisibility(
  submissionId: string,
  isPublic: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await setSubmissionPublicRecord(
    submissionId,
    user.id,
    user.role === "teacher",
    isPublic
  );
  if (result.ok) {
    revalidatePath(`/starhub/${user.username}`);
    revalidatePath("/devlogs");
  }
  return result;
}

/** After creating a gist, send the user to their portfolio. */
export async function createGistAndRedirect(args: {
  title: string;
  description: string;
  language: string;
  code: string;
  isPublic: boolean;
}): Promise<{ ok: false; error: string } | never> {
  const user = await requireUser();
  const result = await createGist(args);
  if (!result.ok) return { ok: false, error: result.error };
  redirect(`/starhub/${user.username}`);
}

// =============================================================
// Tiny helpers
// =============================================================

async function usernameFor(userId: string): Promise<string | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return data?.username ?? null;
}
