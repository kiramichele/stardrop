import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listScenes } from "@/lib/unity-lab-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteSceneButton } from "@/components/unity-lab/DeleteSceneButton";
import { createScene } from "./actions";

export default async function UnityLabPage() {
  const user = await requireUser();
  const scenes = await listScenes(user.id);

  const newButton = (
    <form action={createScene}>
      <Button type="submit">
        <Plus className="w-4 h-4" strokeWidth={2} />
        New scene
      </Button>
    </form>
  );

  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Unity Lab"
        description="Build a scene from GameObjects, give them components and scripts, then press Play to see what Unity would do."
        action={scenes.length > 0 ? newButton : undefined}
      />

      {scenes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Box}
            title="No scenes yet"
            description="Your first scene comes with a camera, a player with a movement script, and some ground to get you started."
            action={newButton}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scenes.map((s) => (
            <Card key={s.id} className="flex items-start justify-between gap-3">
              <Link href={`/unity-lab/${s.id}`} className="min-w-0 flex-1 group">
                <p className="font-display text-lg text-wood-900 truncate group-hover:underline">
                  {s.title}
                </p>
                <p className="text-xs text-wood-500 mt-0.5">
                  Edited{" "}
                  {new Date(s.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>
              <DeleteSceneButton sceneId={s.id} title={s.title} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
