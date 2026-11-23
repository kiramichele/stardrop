"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Box, Circle, Square, Type, Camera } from "lucide-react";
import {
  OBJECT_PRESETS,
  type GameObject,
  type ObjectPreset,
} from "@/lib/unity-lab/scene";
import { PanelHeader } from "./PanelHeader";

interface HierarchyPanelProps {
  objects: GameObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Omit in Play mode to hide the Add menu. */
  onAdd?: (preset: ObjectPreset) => void;
}

export function HierarchyPanel({ objects, selectedId, onSelect, onAdd }: HierarchyPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PanelHeader title="Hierarchy">
        {onAdd && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-wood-700 hover:bg-cream-200"
              aria-expanded={menuOpen}
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-cozy border border-wood-200 bg-cream-50 shadow-cozy-lg py-1">
                {OBJECT_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      onAdd(p.key);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-wood-800 hover:bg-cream-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </PanelHeader>

      <ul className="flex-1 overflow-y-auto py-1 text-sm" role="listbox" aria-label="GameObjects">
        {objects.length === 0 && (
          <li className="px-3 py-2 text-xs text-wood-500">
            Empty scene. Use <strong>Add</strong> to create a GameObject.
          </li>
        )}
        {objects.map((o) => {
          const selected = o.id === selectedId;
          return (
            <li key={o.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                className={`w-full flex items-center gap-2 px-3 py-1 text-left truncate ${
                  selected
                    ? "bg-sky-100 text-sky-950"
                    : "text-wood-800 hover:bg-cream-200"
                } ${o.active ? "" : "opacity-50"}`}
              >
                <ObjectIcon object={o} />
                <span className="truncate">{o.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ObjectIcon({ object }: { object: GameObject }) {
  const cls = "w-3.5 h-3.5 flex-shrink-0 text-wood-500";
  if (object.components.some((c) => c.type === "Camera")) return <Camera className={cls} />;
  const sprite = object.components.find((c) => c.type === "SpriteRenderer");
  if (sprite?.type === "SpriteRenderer") {
    return sprite.shape === "circle" ? <Circle className={cls} /> : <Square className={cls} />;
  }
  if (object.components.some((c) => c.type === "Text")) return <Type className={cls} />;
  return <Box className={cls} />;
}
