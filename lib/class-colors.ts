// Client-safe: the class-color palette and pure resolvers. Both Server
// and Client Components import this.

export type ClassColorKey =
  | "terracotta"
  | "amber"
  | "sage"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "rose";

export type ClassColorStyle = {
  key: ClassColorKey;
  label: string;
  /** Solid fill — for dots and swatches. */
  dot: string;
  /** Soft chip — background + text + border. */
  chip: string;
};

// Full class strings are written out literally so Tailwind's scanner
// picks them up. (terracotta / sage are from globals.css @theme; the rest
// are default Tailwind colors.)
export const CLASS_COLORS: ClassColorStyle[] = [
  {
    key: "terracotta",
    label: "Terracotta",
    dot: "bg-terracotta-500",
    chip: "bg-terracotta-100 text-terracotta-800 border-terracotta-200",
  },
  {
    key: "amber",
    label: "Amber",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    key: "sage",
    label: "Sage",
    dot: "bg-sage-500",
    chip: "bg-sage-100 text-sage-800 border-sage-200",
  },
  {
    key: "teal",
    label: "Teal",
    dot: "bg-teal-500",
    chip: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    key: "sky",
    label: "Sky",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  {
    key: "indigo",
    label: "Indigo",
    dot: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    key: "violet",
    label: "Violet",
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
  },
  {
    key: "rose",
    label: "Rose",
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
  },
];

const BY_KEY = new Map<string, ClassColorStyle>(
  CLASS_COLORS.map((c) => [c.key, c])
);

/** Resolve a stored color key to its styles, or null if unset/unknown. */
export function classColorStyle(
  key: string | null | undefined
): ClassColorStyle | null {
  if (!key) return null;
  return BY_KEY.get(key) ?? null;
}

export function isClassColorKey(value: string): value is ClassColorKey {
  return BY_KEY.has(value);
}
