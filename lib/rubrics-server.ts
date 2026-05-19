import { createClient } from "@/lib/supabase/server";
import { parseRubricCriteria, type Rubric } from "@/lib/rubrics";

export async function getRubricsForTeacher(): Promise<Rubric[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rubrics")
    .select("id, name, criteria, created_at, updated_at")
    .order("name", { ascending: true });
  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    criteria: parseRubricCriteria(r.criteria),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getRubric(rubricId: string): Promise<Rubric | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rubrics")
    .select("id, name, criteria, created_at, updated_at")
    .eq("id", rubricId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    criteria: parseRubricCriteria(data.criteria),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
