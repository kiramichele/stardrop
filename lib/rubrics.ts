// Client-safe: rubric types and pure helpers only.
// Server queries live in lib/rubrics-server.ts.

export type RubricCriterion = {
  id: string;
  label: string;
  points: number;
  description?: string;
};

export type Rubric = {
  id: string;
  name: string;
  criteria: RubricCriterion[];
  created_at: string | null;
  updated_at: string | null;
};

/** Per-criterion earned points, keyed by criterion id. */
export type RubricScores = Record<string, number>;

/** Safely narrow the JSONB `criteria` column into a typed array. */
export function parseRubricCriteria(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) return [];
  const out: RubricCriterion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string") continue;
    if (typeof o.label !== "string") continue;
    if (typeof o.points !== "number") continue;
    out.push({
      id: o.id,
      label: o.label,
      points: o.points,
      description:
        typeof o.description === "string" ? o.description : undefined,
    });
  }
  return out;
}

/** Narrow the JSONB `rubric_scores` column. */
export function parseRubricScores(value: unknown): RubricScores {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: RubricScores = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** Sum of `points` across criteria — the max possible for a rubric. */
export function rubricMaxPoints(criteria: RubricCriterion[]): number {
  return criteria.reduce((sum, c) => sum + (c.points || 0), 0);
}

/** Sum of earned points given a set of per-criterion scores. */
export function rubricEarnedPoints(
  criteria: RubricCriterion[],
  scores: RubricScores
): number {
  return criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
}
