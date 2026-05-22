import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAssets } from "@/lib/assets-server";
import { AddAssetPanel } from "@/components/assets/AddAssetPanel";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

export default async function AssetsPage() {
  const user = await requireUser();
  const assets = await getAssets();
  const isTeacher = user.role === "teacher";

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Asset library"
        description="Sprites, sounds, templates, and game-dev tools — curated for class, plus favorites everyone has shared."
      />

      <AddAssetPanel isTeacher={isTeacher} />

      <AssetLibrary
        assets={assets}
        isTeacher={isTeacher}
        currentUserId={user.id}
      />
    </>
  );
}
