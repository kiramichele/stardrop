"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createProjectRecord,
  finalizeProjectRecord,
  setProjectPublishedRecord,
  updateProjectMetaRecord,
  deleteProjectRecord,
  toggleLikeRecord,
  insertCommentRecord,
  deleteCommentRecord,
} from "@/lib/showcase-server";
import { notifyTeachersBySms } from "@/lib/sms-server";
import { appBaseUrl } from "@/lib/email";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;
const COMMENT_MAX = 2000;

/**
 * Create a draft project, returning the id + storage prefix the browser
 * needs to upload the build's files straight to storage.
 */
export async function createShowcaseProject(
  title: string,
  description: string
): Promise<
  | { ok: true; projectId: string; storagePrefix: string }
  | { ok: false; error: string }
> {
  const user = await requireUser();

  const cleanTitle = title.trim().slice(0, TITLE_MAX);
  const cleanDescription = description.trim().slice(0, DESCRIPTION_MAX);
  if (!cleanTitle) return { ok: false, error: "Give your project a title." };

  const result = await createProjectRecord(
    user.id,
    cleanTitle,
    cleanDescription || null
  );
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    projectId: result.id,
    storagePrefix: result.storagePrefix,
  };
}

/** Mark a draft's build as fully uploaded. */
export async function finalizeShowcaseProject(
  projectId: string,
  indexPath: string,
  fileCount: number,
  thumbnailPath: string | null
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await finalizeProjectRecord(projectId, user.id, {
    indexPath,
    fileCount,
    thumbnailPath,
  });
  if (result.ok) {
    revalidatePath("/showcase");
    revalidatePath(`/showcase/${projectId}`);
  }
  return result;
}

/** Publish or unpublish a project. */
export async function setShowcasePublished(
  projectId: string,
  published: boolean
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await setProjectPublishedRecord(
    projectId,
    user.id,
    user.role === "teacher",
    published
  );
  if (!result.ok) return result;

  revalidatePath("/showcase");
  revalidatePath(`/showcase/${projectId}`);

  // Fire a one-time "new project" SMS the first time a student publishes.
  if (result.justPublished && user.role === "student") {
    const base = appBaseUrl();
    const url = base ? `${base}/showcase/${projectId}` : "";
    const studentName =
      `${user.first_name} ${user.last_name}`.trim() || "A student";
    const body = `🎮 ${studentName} published "${result.title}" to the showcase${
      url ? ` — ${url}` : ""
    }`;
    void notifyTeachersBySms("showcase", body);
  }

  return { ok: true };
}

/** Edit a project's title / description. */
export async function updateShowcaseProject(
  projectId: string,
  title: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const cleanTitle = title.trim().slice(0, TITLE_MAX);
  const cleanDescription = description.trim().slice(0, DESCRIPTION_MAX);
  if (!cleanTitle) return { ok: false, error: "Title can't be empty." };

  const result = await updateProjectMetaRecord(
    projectId,
    user.id,
    user.role === "teacher",
    cleanTitle,
    cleanDescription || null
  );
  if (result.ok) {
    revalidatePath("/showcase");
    revalidatePath(`/showcase/${projectId}`);
  }
  return result;
}

/** Delete a project and its build files, then return to the gallery. */
export async function deleteShowcaseProject(projectId: string): Promise<void> {
  const user = await requireUser();
  const result = await deleteProjectRecord(
    projectId,
    user.id,
    user.role === "teacher"
  );
  if (!result.ok) throw new Error(result.error ?? "Couldn't delete project");
  revalidatePath("/showcase");
  redirect("/showcase");
}

/** Toggle the current user's like on a project. */
export async function toggleShowcaseLike(
  projectId: string
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const user = await requireUser();
  const result = await toggleLikeRecord(projectId, user.id);
  if (result.ok) {
    revalidatePath("/showcase");
    revalidatePath(`/showcase/${projectId}`);
  }
  return result;
}

/** Post a comment or reply on a project. */
export async function addShowcaseComment(
  projectId: string,
  body: string,
  parentId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const clean = body.trim().slice(0, COMMENT_MAX);
  if (!clean) return { ok: false, error: "Write something first." };

  const result = await insertCommentRecord(
    projectId,
    user.id,
    clean,
    parentId
  );
  if (result.ok) revalidatePath(`/showcase/${projectId}`);
  return result;
}

/** Remove a comment (author or teacher). */
export async function deleteShowcaseComment(
  commentId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await deleteCommentRecord(
    commentId,
    user.id,
    user.role === "teacher"
  );
  if (result.ok && result.projectId) {
    revalidatePath(`/showcase/${result.projectId}`);
  }
  return { ok: result.ok, error: result.error };
}
