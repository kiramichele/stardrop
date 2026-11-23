// What a Play (AI simulation) returns, and how the Scene view plays it
// back. Client-safe.

import type { GameObject, Scene } from "./scene";

/** How many seconds of play time each simulation covers. */
export const SIM_SECONDS = 5;
export const MAX_SCENARIO_CHARS = 300;

export const TIMELINE_PROPERTIES = [
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "color",
  "text",
  "active",
] as const;
export type TimelineProperty = (typeof TIMELINE_PROPERTIES)[number];

const NUMERIC: ReadonlySet<TimelineProperty> = new Set([
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
]);

export type TimelineKey = {
  time: number;
  objectId: string;
  property: TimelineProperty;
  /** Always a string on the wire; numbers/bools are parsed on playback. */
  value: string;
};

export type ConsoleEntry = {
  time: number;
  type: "log" | "warning" | "error";
  message: string;
};

export type CompileError = { script: string; line: number; message: string };

export type SimulationResult = {
  compileErrors: CompileError[];
  console: ConsoleEntry[];
  timeline: TimelineKey[];
  explanation: string;
};

/** JSON schema for structured output — mirrors SimulationResult. */
export const SIMULATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["compileErrors", "console", "timeline", "explanation"],
  properties: {
    compileErrors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["script", "line", "message"],
        properties: {
          script: { type: "string" },
          line: { type: "integer" },
          message: { type: "string" },
        },
      },
    },
    console: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "type", "message"],
        properties: {
          time: { type: "number" },
          type: { type: "string", enum: ["log", "warning", "error"] },
          message: { type: "string" },
        },
      },
    },
    timeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "objectId", "property", "value"],
        properties: {
          time: { type: "number" },
          objectId: { type: "string" },
          property: { type: "string", enum: [...TIMELINE_PROPERTIES] },
          value: { type: "string" },
        },
      },
    },
    explanation: { type: "string" },
  },
} as const;

/** Coerce the model's JSON into a safe SimulationResult (clamped sizes). */
export function sanitizeResult(raw: unknown, objectIds: Set<string>): SimulationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const time = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(SIM_SECONDS, Math.max(0, n)) : 0;
  };

  const compileErrors = arr(r.compileErrors)
    .slice(0, 50)
    .map((e) => e as Record<string, unknown>)
    .map((e) => ({
      script: String(e.script ?? "").slice(0, 80),
      line: Math.max(0, Math.trunc(Number(e.line) || 0)),
      message: String(e.message ?? "").slice(0, 500),
    }));

  const console = arr(r.console)
    .slice(0, 200)
    .map((e) => e as Record<string, unknown>)
    .map((e) => ({
      time: time(e.time),
      type: (["log", "warning", "error"].includes(e.type as string)
        ? e.type
        : "log") as ConsoleEntry["type"],
      message: String(e.message ?? "").slice(0, 500),
    }))
    .sort((a, b) => a.time - b.time);

  const timeline = arr(r.timeline)
    .slice(0, 2000)
    .map((e) => e as Record<string, unknown>)
    .filter(
      (e) =>
        objectIds.has(String(e.objectId)) &&
        (TIMELINE_PROPERTIES as readonly string[]).includes(String(e.property))
    )
    .map((e) => ({
      time: time(e.time),
      objectId: String(e.objectId),
      property: e.property as TimelineProperty,
      value: String(e.value ?? "").slice(0, 500),
    }));

  return {
    compileErrors,
    console,
    timeline,
    explanation: String(r.explanation ?? "").slice(0, 8000),
  };
}

// =============================================================
// Playback
// =============================================================

/** objectId → property → keys sorted by time. */
export type Tracks = Map<string, Map<TimelineProperty, { time: number; value: string }[]>>;

export function buildTracks(timeline: TimelineKey[]): Tracks {
  const tracks: Tracks = new Map();
  for (const k of timeline) {
    let byProp = tracks.get(k.objectId);
    if (!byProp) tracks.set(k.objectId, (byProp = new Map()));
    let keys = byProp.get(k.property);
    if (!keys) byProp.set(k.property, (keys = []));
    keys.push({ time: k.time, value: k.value });
  }
  for (const byProp of tracks.values()) {
    for (const keys of byProp.values()) keys.sort((a, b) => a.time - b.time);
  }
  return tracks;
}

function baseNumber(o: GameObject, p: TimelineProperty): number {
  return o.transform[p as "x" | "y" | "rotation" | "scaleX" | "scaleY"];
}

/** Numeric value at time t: linear between keys; edit-time value at t=0. */
function numberAt(base: number, keys: { time: number; value: string }[], t: number): number {
  let prevT = 0;
  let prevV = base;
  for (const k of keys) {
    const v = Number.parseFloat(k.value);
    if (!Number.isFinite(v)) continue;
    if (k.time >= t) {
      if (k.time === prevT) return v;
      const f = (t - prevT) / (k.time - prevT);
      return prevV + (v - prevV) * Math.min(1, Math.max(0, f));
    }
    prevT = k.time;
    prevV = v;
  }
  return prevV;
}

/** Discrete value at time t: the latest key at or before t, else null. */
function latestAt(keys: { time: number; value: string }[], t: number): string | null {
  let out: string | null = null;
  for (const k of keys) {
    if (k.time <= t) out = k.value;
    else break;
  }
  return out;
}

/** The scene as it looks at play time t (never mutates the edit scene). */
export function sceneAt(scene: Scene, tracks: Tracks, t: number): Scene {
  return {
    ...scene,
    objects: scene.objects.map((o) => {
      const byProp = tracks.get(o.id);
      if (!byProp) return o;
      const transform = { ...o.transform };
      let active = o.active;
      let components = o.components;
      for (const [prop, keys] of byProp) {
        if (NUMERIC.has(prop)) {
          transform[prop as keyof typeof transform] = numberAt(baseNumber(o, prop), keys, t);
          continue;
        }
        const v = latestAt(keys, t);
        if (v === null) continue;
        if (prop === "active") active = v === "true";
        else if (prop === "text") {
          components = components.map((c) => (c.type === "Text" ? { ...c, text: v } : c));
        } else if (prop === "color" && /^#[0-9a-fA-F]{6}$/.test(v)) {
          const hasSprite = components.some((c) => c.type === "SpriteRenderer");
          components = components.map((c) =>
            c.type === "SpriteRenderer" || (!hasSprite && c.type === "Text")
              ? { ...c, color: v }
              : c
          );
        }
      }
      return { ...o, transform, active, components };
    }),
  };
}
