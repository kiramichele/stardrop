"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteScene } from "@/app/unity-lab/actions";

export function DeleteSceneButton({ sceneId, title }: { sceneId: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
        start(async () => {
          const r = await deleteScene(sceneId);
          if (!r.ok) alert(r.error ?? "Couldn't delete the scene.");
        });
      }}
      className="p-1.5 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-cream-200 disabled:opacity-50"
      aria-label={`Delete ${title}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
