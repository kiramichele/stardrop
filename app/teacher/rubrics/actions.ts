"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth";
import type { RubricCriterion } from "@/lib/rubrics";
import type { Json } from "@/types/database";

/**
 * RubricEditor serializes its dynamic criteria rows into a hidden
 * `criteria_json` field on submit. This helper validates that payload
 * and returns a clean RubricCriterion[].
 */
function parseCriteriaFromForm(formData: FormData):
  | { ok: true; criteria: RubricCriterion[] }
  | { ok: false; error: string } {
  const raw = formData.get("criteria_json")?.toString();
  if (!raw) return { ok: false, error: "Criteria missing" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid criteria payload" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Invalid criteria payload" };
  }

  const criteria: RubricCriterion[] = [];
  for (const c of parsed) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : crypto.randomUUID();
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const points = Number(o.points);
    const descriptionRaw =
      typeof o.description === "string" ? o.description.trim() : "";

    if (!label) return { ok: false, error: "Every criterion needs a label." };
    if (!Number.isFinite(points) || points <= 0) {
      return {
        ok: false,
        error: `"${label}" needs a positive point value.`,
      };
    }
    criteria.push({
      id,
      label,
      points,
      description: descriptionRaw || undefined,
    });
  }
  if (criteria.length === 0) {
    return { ok: false, error: "Add at least one criterion." };
  }
  return { ok: true, criteria };
}

export async function createRubric(formData: FormData) {
  await requireTeacher();
  const name = formData.get("name")?.toString().trim();
  if (!name) throw new Error("Rubric name required");

  const result = parseCriteriaFromForm(formData);
  if (!result.ok) throw new Error(result.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rubrics")
    .insert({ name, criteria: result.criteria as unknown as Json })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create");

  revalidatePath("/teacher/rubrics");
  redirect(`/teacher/rubrics/${data.id}`);
}

export async function updateRubric(rubricId: string, formData: FormData) {
  await requireTeacher();
  const name = formData.get("name")?.toString().trim();
  if (!name) throw new Error("Rubric name required");

  const result = parseCriteriaFromForm(formData);
  if (!result.ok) throw new Error(result.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("rubrics")
    .update({ name, criteria: result.criteria as unknown as Json })
    .eq("id", rubricId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/rubrics");
  revalidatePath(`/teacher/rubrics/${rubricId}`);
}

export async function deleteRubric(rubricId: string) {
  await requireTeacher();
  const supabase = await createClient();

  // Detach from any assignments first so the FK doesn't block deletion.
  // (If the DB FK is ON DELETE SET NULL this is redundant; if it's
  // RESTRICT/NO ACTION, this is required.)
  await supabase
    .from("assignments")
    .update({ rubric_id: null })
    .eq("rubric_id", rubricId);

  const { error } = await supabase.from("rubrics").delete().eq("id", rubricId);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/rubrics");
  redirect("/teacher/rubrics");
}
