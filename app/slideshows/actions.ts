"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth";
import {
  insertSlideshowRow,
  updateSlideshowRow,
  deleteSlideshowRow,
  type SlideshowPatch,
} from "@/lib/slideshows-server";

async function uploadSlideshowHtml(
  id: string,
  file: File
): Promise<string | null> {
  const admin = createAdminClient();
  const path = `slideshows/${id}.html`;
  const bytes = await file.arrayBuffer();
  const { error } = await admin.storage.from("lessons").upload(path, bytes, {
    contentType: "text/html",
    upsert: true,
    cacheControl: "60",
  });
  if (error) return null;
  return `/api/files/lessons/${path}`;
}

function parseForm(formData: FormData) {
  return {
    classDate: formData.get("class_date")?.toString() ?? "",
    title: formData.get("title")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() || null,
    lessonIds: formData.getAll("lesson_ids").map(String).filter(Boolean),
    assignmentIds: formData.getAll("assignment_ids").map(String).filter(Boolean),
    file: formData.get("html_file") as File | null,
  };
}

export async function createSlideshow(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireTeacher();
  const { classDate, title, description, lessonIds, assignmentIds, file } =
    parseForm(formData);

  if (!classDate) return { ok: false, error: "Pick a date" };
  if (!title) return { ok: false, error: "Title required" };
  if (file && file.size > 0 && !file.name.toLowerCase().endsWith(".html")) {
    return { ok: false, error: "Slideshow file must be an .html file" };
  }

  const { data, error } = await insertSlideshowRow({
    class_date: classDate,
    title,
    description,
    lesson_ids: lessonIds,
    assignment_ids: assignmentIds,
  });
  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return {
        ok: false,
        error: "A slideshow already exists for that date — edit it instead.",
      };
    }
    return { ok: false, error: msg || "Failed to create slideshow" };
  }

  if (file && file.size > 0) {
    const url = await uploadSlideshowHtml(data.id, file);
    if (url) await updateSlideshowRow(data.id, { html_url: url });
  }

  revalidatePath("/slideshows");
  revalidatePath("/student");
  revalidatePath("/teacher");
  return { ok: true, id: data.id };
}

export async function updateSlideshow(
  id: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacher();
  const { classDate, title, description, lessonIds, assignmentIds, file } =
    parseForm(formData);

  if (!classDate) return { ok: false, error: "Pick a date" };
  if (!title) return { ok: false, error: "Title required" };
  if (file && file.size > 0 && !file.name.toLowerCase().endsWith(".html")) {
    return { ok: false, error: "Slideshow file must be an .html file" };
  }

  const patch: SlideshowPatch = {
    class_date: classDate,
    title,
    description,
    lesson_ids: lessonIds,
    assignment_ids: assignmentIds,
    updated_at: new Date().toISOString(),
  };
  if (file && file.size > 0) {
    const url = await uploadSlideshowHtml(id, file);
    if (url) patch.html_url = url;
  }

  const { error } = await updateSlideshowRow(id, patch);
  if (error) {
    const msg = error.message;
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return { ok: false, error: "Another slideshow already uses that date." };
    }
    return { ok: false, error: msg };
  }

  revalidatePath("/slideshows");
  revalidatePath(`/slideshows/${id}`);
  revalidatePath("/student");
  revalidatePath("/teacher");
  return { ok: true };
}

export async function deleteSlideshow(id: string): Promise<void> {
  await requireTeacher();
  const admin = createAdminClient();
  await admin.storage.from("lessons").remove([`slideshows/${id}.html`]);
  await deleteSlideshowRow(id);
  revalidatePath("/slideshows");
  revalidatePath("/student");
  revalidatePath("/teacher");
  redirect("/slideshows");
}
