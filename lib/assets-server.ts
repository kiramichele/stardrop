import { createAdminClient } from "@/lib/supabase/admin";
import type { Asset, AssetView, AssetContributor } from "@/lib/assets";

// =============================================================
// Regen-proof shim
// -------------------------------------------------------------
// `assets` isn't in types/database.ts (and a types regen would drop any
// hand-add), so this file reaches the table through a small typed shim.
// Once it's in the generated types, swap the shim for admin.from("assets").
// =============================================================

type DbError = { message: string } | null;

interface SelectChain<T> extends PromiseLike<{ data: T[] | null; error: DbError }> {
  eq(col: string, val: string): SelectChain<T>;
  order(col: string, opts?: { ascending?: boolean }): SelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: DbError }>;
}

interface MutateChain extends PromiseLike<{ error: DbError }> {
  eq(col: string, val: string): MutateChain;
}

interface ShimTable<T> {
  select(cols: string): SelectChain<T>;
  insert(row: Record<string, unknown>): PromiseLike<{ error: DbError }>;
  delete(): MutateChain;
}

type Admin = ReturnType<typeof createAdminClient>;

function assetsTable(admin: Admin): ShimTable<Asset> {
  return (
    admin as unknown as { from: (t: string) => ShimTable<Asset> }
  ).from("assets");
}

const ASSETS_BUCKET = "assets";

// =============================================================
// Helpers
// =============================================================

/** Pull the file extension off a name — lowercased, alphanumeric only. */
function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "bin";
  const ext = fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "bin";
}

/** Attach each asset's contributor (and their role) for rendering. */
async function attachContributors(
  admin: Admin,
  rows: Asset[]
): Promise<AssetView[]> {
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.added_by))];
  const { data } = await admin
    .from("users")
    .select("id, first_name, last_name, avatar_url, role")
    .in("id", ids);

  const byId = new Map<string, AssetContributor>();
  for (const u of data ?? []) {
    byId.set(u.id, {
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      avatarUrl: u.avatar_url,
      role: u.role === "teacher" ? "teacher" : "student",
    });
  }
  const fallback: AssetContributor = {
    id: "",
    firstName: "Someone",
    lastName: "",
    avatarUrl: null,
    role: "student",
  };
  return rows.map((r) => ({
    ...r,
    contributor: byId.get(r.added_by) ?? fallback,
  }));
}

// =============================================================
// Reads
// =============================================================

/** Every asset in the library, newest first. */
export async function getAssets(): Promise<AssetView[]> {
  const admin = createAdminClient();
  const { data } = await assetsTable(admin)
    .select("*")
    .order("created_at", { ascending: false });
  return attachContributors(admin, data ?? []);
}

// =============================================================
// Writes
// =============================================================

type NewAssetMeta = {
  title: string;
  description: string | null;
  category: string;
};

/** Upload a file to the assets bucket and record it as an asset. */
export async function createFileAsset(
  userId: string,
  args: NewAssetMeta & { file: File }
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const id = crypto.randomUUID();
  const storagePath = `${id}.${extOf(args.file.name)}`;

  const bytes = await args.file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(ASSETS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: args.file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error } = await assetsTable(admin).insert({
    id,
    title: args.title,
    description: args.description,
    category: args.category,
    url: null,
    storage_path: storagePath,
    file_name: args.file.name,
    file_size: args.file.size,
    mime_type: args.file.type || null,
    added_by: userId,
  });
  if (error) {
    // Keep storage and the table in sync if the row insert fails.
    await admin.storage.from(ASSETS_BUCKET).remove([storagePath]);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Record an external link as an asset. */
export async function createLinkAsset(
  userId: string,
  args: NewAssetMeta & { url: string }
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await assetsTable(admin).insert({
    id: crypto.randomUUID(),
    title: args.title,
    description: args.description,
    category: args.category,
    url: args.url,
    storage_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    added_by: userId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Delete an asset (and its file, if any). Owner or teacher only. */
export async function deleteAssetRecord(
  assetId: string,
  userId: string,
  isTeacher: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: asset } = await assetsTable(admin)
    .select("added_by, storage_path")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset) return { ok: false, error: "Asset not found" };
  if (!isTeacher && asset.added_by !== userId) {
    return { ok: false, error: "Not authorized" };
  }

  if (asset.storage_path) {
    try {
      await admin.storage.from(ASSETS_BUCKET).remove([asset.storage_path]);
    } catch {
      // ignore — the row delete below is what matters
    }
  }

  const { error } = await assetsTable(admin).delete().eq("id", assetId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
