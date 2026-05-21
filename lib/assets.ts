// Client-safe: asset-library types, category config, and pure helpers.
// Both Server and Client Components import this — keep server-only imports out.

// =============================================================
// Categories
// =============================================================

export type AssetCategoryKey =
  | "sprites"
  | "audio"
  | "templates"
  | "tools"
  | "tutorials"
  | "other";

export type AssetCategory = { key: AssetCategoryKey; label: string };

export const ASSET_CATEGORIES: AssetCategory[] = [
  { key: "sprites", label: "Sprites & Art" },
  { key: "audio", label: "Audio & Music" },
  { key: "templates", label: "Templates" },
  { key: "tools", label: "Tools" },
  { key: "tutorials", label: "Tutorials" },
  { key: "other", label: "Other" },
];

const CATEGORY_KEYS = new Set<string>(ASSET_CATEGORIES.map((c) => c.key));

export function isAssetCategory(value: string): value is AssetCategoryKey {
  return CATEGORY_KEYS.has(value);
}

export function categoryLabel(key: string): string {
  return ASSET_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";
}

// =============================================================
// Types
// =============================================================

/** A row from the `assets` table. */
export type Asset = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  added_by: string;
  created_at: string;
};

export type AssetContributor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "teacher" | "student";
};

/** An asset plus the person who added it — what the library renders. */
export type AssetView = Asset & { contributor: AssetContributor };

export type AssetKind = "file" | "link";

/** Uploaded file vs. external link. */
export function assetKind(a: Asset): AssetKind {
  return a.storage_path ? "file" : "link";
}

// =============================================================
// URLs
// =============================================================

/** Public URL for a file in the `assets` storage bucket. */
export function publicAssetUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/+$/,
    ""
  );
  return `${base}/storage/v1/object/public/assets/${storagePath}`;
}

/**
 * Where the asset's "Download" / "Open" action points. For uploaded files
 * the `?download=` param makes Supabase serve it as an attachment with the
 * original filename.
 */
export function assetHref(a: Asset): string {
  if (a.storage_path) {
    const url = publicAssetUrl(a.storage_path);
    return a.file_name
      ? `${url}?download=${encodeURIComponent(a.file_name)}`
      : url;
  }
  return a.url ?? "#";
}

/** Raw public URL for previewing a file inline (image / audio). */
export function assetPreviewUrl(a: Asset): string | null {
  return a.storage_path ? publicAssetUrl(a.storage_path) : null;
}

export function isImageAsset(a: Asset): boolean {
  return assetKind(a) === "file" && (a.mime_type ?? "").startsWith("image/");
}

export function isAudioAsset(a: Asset): boolean {
  return assetKind(a) === "file" && (a.mime_type ?? "").startsWith("audio/");
}

/** Hostname of a link asset, without "www." — e.g. "assetstore.unity.com". */
export function linkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// =============================================================
// Misc helpers
// =============================================================

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Validate a user-submitted link — http / https only. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Contributor display name — first name + last initial. */
export function contributorName(c: AssetContributor): string {
  const first = c.firstName.trim();
  const last = c.lastName.trim();
  if (!first && !last) return "Someone";
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}
