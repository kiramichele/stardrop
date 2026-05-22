"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAssetCategory, isSafeHttpUrl } from "@/lib/assets";
import {
  createFileAsset,
  createLinkAsset,
  deleteAssetRecord,
} from "@/lib/assets-server";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 600;

/**
 * Add an asset to the library. Teachers may upload a file or add a link;
 * students may add links only. One action handles both — a file in the
 * payload means an upload, otherwise it's a link.
 */
export async function createAsset(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();

  const title = (formData.get("title")?.toString() ?? "")
    .trim()
    .slice(0, TITLE_MAX);
  const category = formData.get("category")?.toString() ?? "";
  const description =
    (formData.get("description")?.toString() ?? "")
      .trim()
      .slice(0, DESCRIPTION_MAX) || null;
  const url = (formData.get("url")?.toString() ?? "").trim();
  const file = formData.get("file");

  if (!title) return { ok: false, error: "Give the asset a title." };
  if (!isAssetCategory(category)) {
    return { ok: false, error: "Pick a category." };
  }

  const hasFile = file instanceof File && file.size > 0;
  const meta = { title, description, category };

  if (hasFile) {
    if (user.role !== "teacher") {
      return {
        ok: false,
        error: "Only teachers can upload files — add a link instead.",
      };
    }
    const result = await createFileAsset(user.id, { ...meta, file });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Couldn't add the asset." };
    }
  } else if (url) {
    if (!isSafeHttpUrl(url)) {
      return { ok: false, error: "Enter a valid link starting with https://" };
    }
    const result = await createLinkAsset(user.id, { ...meta, url });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Couldn't add the asset." };
    }
  } else {
    return { ok: false, error: "Upload a file or paste a link." };
  }

  revalidatePath("/assets");
  return { ok: true };
}

/** Remove an asset. Owner or teacher only. */
export async function deleteAsset(
  assetId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await deleteAssetRecord(
    assetId,
    user.id,
    user.role === "teacher"
  );
  if (result.ok) revalidatePath("/assets");
  return result;
}
