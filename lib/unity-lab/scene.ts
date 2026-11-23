// Unity Lab scene model + pure helpers. Client-safe (no server imports).
//
// The scene is deliberately small: a flat list of GameObjects (no
// parenting in v1), each with a Transform and a few component types, plus
// the MonoBehaviour scripts those objects use. It's saved whole as one
// JSON document in unity_lab_scenes.scene.

export type Transform = {
  x: number;
  y: number;
  /** Degrees, counter-clockwise (Unity's Z rotation in 2D). */
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type FieldValue = string | number | boolean;

export type Component =
  | { type: "Camera" }
  | { type: "SpriteRenderer"; color: string; shape: "square" | "circle" }
  | { type: "Text"; text: string; fontSize: number; color: string }
  | { type: "Rigidbody2D"; gravityScale: number }
  | { type: "BoxCollider2D" }
  | {
      type: "Script";
      scriptId: string;
      /** Inspector overrides for the script's public fields. */
      fields: Record<string, FieldValue>;
    };

export type ComponentType = Component["type"];

export type GameObject = {
  id: string;
  name: string;
  active: boolean;
  transform: Transform;
  components: Component[];
};

/** A MonoBehaviour. Its class name is read from the code itself. */
export type Script = { id: string; code: string };

export type Scene = {
  version: 1;
  objects: GameObject[];
  scripts: Script[];
};

// =============================================================
// Limits (also enforced server-side)
// =============================================================

export const MAX_OBJECTS = 50;
export const MAX_SCRIPTS = 20;
export const MAX_SCRIPT_CHARS = 20_000;
export const MAX_TITLE_CHARS = 80;

/** World units visible in the Scene view (16:9), centred on the camera. */
export const VIEW_WIDTH = 16;
export const VIEW_HEIGHT = 9;

// =============================================================
// Construction
// =============================================================

export function newId(): string {
  return crypto.randomUUID();
}

const DEFAULT_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

export type ObjectPreset = "empty" | "square" | "circle" | "text";

export const OBJECT_PRESETS: { key: ObjectPreset; label: string }[] = [
  { key: "empty", label: "Create Empty" },
  { key: "square", label: "Square" },
  { key: "circle", label: "Circle" },
  { key: "text", label: "Text" },
];

export function makeObject(preset: ObjectPreset, existing: GameObject[]): GameObject {
  const base: Record<ObjectPreset, { name: string; components: Component[] }> = {
    empty: { name: "GameObject", components: [] },
    square: {
      name: "Square",
      components: [{ type: "SpriteRenderer", color: "#4f9d69", shape: "square" }],
    },
    circle: {
      name: "Circle",
      components: [{ type: "SpriteRenderer", color: "#d9822b", shape: "circle" }],
    },
    text: {
      name: "Text",
      components: [
        { type: "Text", text: "New Text", fontSize: 0.6, color: "#1f2937" },
      ],
    },
  };
  const { name, components } = base[preset];
  return {
    id: newId(),
    name: uniqueName(name, existing),
    active: true,
    transform: { ...DEFAULT_TRANSFORM },
    components,
  };
}

/** "Square", "Square (1)", "Square (2)" — Unity's duplicate naming. */
export function uniqueName(name: string, existing: GameObject[]): string {
  const taken = new Set(existing.map((o) => o.name));
  if (!taken.has(name)) return name;
  for (let i = 1; ; i++) {
    const candidate = `${name} (${i})`;
    if (!taken.has(candidate)) return candidate;
  }
}

export function defaultScene(): Scene {
  const scriptId = newId();
  return {
    version: 1,
    scripts: [{ id: scriptId, code: scriptStarter("PlayerMove", true) }],
    objects: [
      {
        id: newId(),
        name: "Main Camera",
        active: true,
        transform: { ...DEFAULT_TRANSFORM },
        components: [{ type: "Camera" }],
      },
      {
        id: newId(),
        name: "Player",
        active: true,
        transform: { ...DEFAULT_TRANSFORM, y: -1 },
        components: [
          { type: "SpriteRenderer", color: "#4f9d69", shape: "square" },
          { type: "Script", scriptId, fields: {} },
        ],
      },
      {
        id: newId(),
        name: "Ground",
        active: true,
        transform: { ...DEFAULT_TRANSFORM, y: -3, scaleX: 12, scaleY: 0.5 },
        components: [
          { type: "SpriteRenderer", color: "#8b6f4e", shape: "square" },
          { type: "BoxCollider2D" },
        ],
      },
    ],
  };
}

export function scriptStarter(className: string, example = false): string {
  if (example) {
    return `using UnityEngine;

public class ${className} : MonoBehaviour
{
    public float speed = 3f;

    // Start is called once, before the first frame
    void Start()
    {
        Debug.Log("Hello from " + gameObject.name);
    }

    // Update is called once per frame
    void Update()
    {
        // Move right a little every frame
        transform.Translate(speed * Time.deltaTime, 0, 0);
    }
}
`;
  }
  return `using UnityEngine;

public class ${className} : MonoBehaviour
{
    // Start is called once, before the first frame
    void Start()
    {

    }

    // Update is called once per frame
    void Update()
    {

    }
}
`;
}

// =============================================================
// Scripts
// =============================================================

/** The MonoBehaviour's class name, or null if the code has none. */
export function scriptClassName(code: string): string | null {
  const m = code.match(/\bclass\s+([A-Za-z_]\w*)/);
  return m ? m[1] : null;
}

export function isValidClassName(name: string): boolean {
  return /^[A-Za-z_]\w{0,60}$/.test(name);
}

export type PublicField = {
  name: string;
  type: "int" | "float" | "string" | "bool";
  defaultValue: FieldValue;
};

/**
 * Fields Unity would show in the Inspector: `public` fields and
 * `[SerializeField]` private ones, for the simple types we support.
 */
export function parsePublicFields(code: string): PublicField[] {
  const re =
    /^[ \t]*(?:\[SerializeField\][ \t]*(?:private[ \t]+)?|public[ \t]+)(int|float|double|string|bool)[ \t]+([A-Za-z_]\w*)[ \t]*(?:=[ \t]*([^;]+))?;/gm;
  const fields: PublicField[] = [];
  const seen = new Set<string>();
  for (const m of code.matchAll(re)) {
    const rawType = m[1] === "double" ? "float" : m[1];
    const type = rawType as PublicField["type"];
    const name = m[2];
    if (seen.has(name)) continue;
    seen.add(name);
    fields.push({ name, type, defaultValue: parseDefault(type, m[3]) });
  }
  return fields;
}

function parseDefault(type: PublicField["type"], raw: string | undefined): FieldValue {
  const v = raw?.trim();
  if (type === "bool") return v === "true";
  if (type === "string") {
    const s = v?.match(/^"(.*)"$/);
    return s ? s[1] : "";
  }
  const n = Number.parseFloat((v ?? "0").replace(/[fFdD]$/, ""));
  if (!Number.isFinite(n)) return 0;
  return type === "int" ? Math.trunc(n) : n;
}

/** Inspector value wins; otherwise the default written in the code. */
export function resolvedFieldValues(
  fields: PublicField[],
  overrides: Record<string, FieldValue>
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of fields) {
    const o = overrides[f.name];
    out[f.name] = typeof o === typeof f.defaultValue ? o : f.defaultValue;
  }
  return out;
}

// =============================================================
// Components
// =============================================================

export const COMPONENT_LABELS: Record<Exclude<ComponentType, "Script">, string> = {
  Camera: "Camera",
  SpriteRenderer: "Sprite Renderer",
  Text: "Text",
  Rigidbody2D: "Rigidbody 2D",
  BoxCollider2D: "Box Collider 2D",
};

/** Built-in components a student can add from the Inspector. */
export const ADDABLE_COMPONENTS: Exclude<ComponentType, "Script" | "Camera">[] = [
  "SpriteRenderer",
  "Text",
  "Rigidbody2D",
  "BoxCollider2D",
];

export function makeComponent(
  type: Exclude<ComponentType, "Script" | "Camera">
): Component {
  switch (type) {
    case "SpriteRenderer":
      return { type, color: "#4f9d69", shape: "square" };
    case "Text":
      return { type, text: "New Text", fontSize: 0.6, color: "#1f2937" };
    case "Rigidbody2D":
      return { type, gravityScale: 1 };
    case "BoxCollider2D":
      return { type };
  }
}

export function cameraObject(scene: Scene): GameObject | undefined {
  return scene.objects.find(
    (o) => o.active && o.components.some((c) => c.type === "Camera")
  );
}

// =============================================================
// Validation (used server-side on save + simulate)
// =============================================================

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function num(v: unknown, fallback: number, min = -1e4, max = 1e4): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(v: unknown, max: number, fallback = ""): string {
  return typeof v === "string" ? v.slice(0, max) : fallback;
}

function color(v: unknown, fallback: string): string {
  return typeof v === "string" && COLOR_RE.test(v) ? v : fallback;
}

function sanitizeComponent(raw: unknown, scriptIds: Set<string>): Component | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  switch (c.type) {
    case "Camera":
    case "BoxCollider2D":
      return { type: c.type };
    case "SpriteRenderer":
      return {
        type: "SpriteRenderer",
        color: color(c.color, "#4f9d69"),
        shape: c.shape === "circle" ? "circle" : "square",
      };
    case "Text":
      return {
        type: "Text",
        text: str(c.text, 500),
        fontSize: num(c.fontSize, 0.6, 0.1, 10),
        color: color(c.color, "#1f2937"),
      };
    case "Rigidbody2D":
      return { type: "Rigidbody2D", gravityScale: num(c.gravityScale, 1, -100, 100) };
    case "Script": {
      const scriptId = str(c.scriptId, 64);
      if (!scriptIds.has(scriptId)) return null;
      const fields: Record<string, FieldValue> = {};
      if (c.fields && typeof c.fields === "object") {
        for (const [k, v] of Object.entries(c.fields as Record<string, unknown>).slice(0, 50)) {
          if (!/^[A-Za-z_]\w{0,60}$/.test(k)) continue;
          if (typeof v === "boolean") fields[k] = v;
          else if (typeof v === "number" && Number.isFinite(v)) fields[k] = v;
          else if (typeof v === "string") fields[k] = v.slice(0, 500);
        }
      }
      return { type: "Script", scriptId, fields };
    }
    default:
      return null;
  }
}

/**
 * Coerce untrusted JSON into a valid Scene (dropping anything malformed
 * and enforcing the limits). Returns an error only when the shape is
 * unusable or a limit is exceeded.
 */
export function sanitizeScene(raw: unknown): { scene: Scene } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Invalid scene." };
  const r = raw as Record<string, unknown>;
  const rawScripts = Array.isArray(r.scripts) ? r.scripts : [];
  const rawObjects = Array.isArray(r.objects) ? r.objects : [];
  if (rawObjects.length > MAX_OBJECTS) {
    return { error: `A scene can have at most ${MAX_OBJECTS} objects.` };
  }
  if (rawScripts.length > MAX_SCRIPTS) {
    return { error: `A scene can have at most ${MAX_SCRIPTS} scripts.` };
  }

  const scripts: Script[] = [];
  for (const s of rawScripts) {
    if (!s || typeof s !== "object") continue;
    const id = str((s as Record<string, unknown>).id, 64);
    const code = str((s as Record<string, unknown>).code, MAX_SCRIPT_CHARS + 1);
    if (!id) continue;
    if (code.length > MAX_SCRIPT_CHARS) {
      return { error: `A script can be at most ${MAX_SCRIPT_CHARS} characters.` };
    }
    scripts.push({ id, code });
  }
  const scriptIds = new Set(scripts.map((s) => s.id));

  const objects: GameObject[] = [];
  for (const o of rawObjects) {
    if (!o || typeof o !== "object") continue;
    const obj = o as Record<string, unknown>;
    const id = str(obj.id, 64);
    if (!id) continue;
    const t = (obj.transform ?? {}) as Record<string, unknown>;
    objects.push({
      id,
      name: str(obj.name, 60, "GameObject") || "GameObject",
      active: obj.active !== false,
      transform: {
        x: num(t.x, 0),
        y: num(t.y, 0),
        rotation: num(t.rotation, 0, -36000, 36000),
        scaleX: num(t.scaleX, 1, -1000, 1000),
        scaleY: num(t.scaleY, 1, -1000, 1000),
      },
      components: (Array.isArray(obj.components) ? obj.components : [])
        .slice(0, 20)
        .map((c) => sanitizeComponent(c, scriptIds))
        .filter((c): c is Component => c !== null),
    });
  }

  return { scene: { version: 1, objects, scripts } };
}
