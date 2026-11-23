"use client";

import { useRef } from "react";
import {
  VIEW_HEIGHT,
  VIEW_WIDTH,
  cameraObject,
  type GameObject,
  type Scene,
} from "@/lib/unity-lab/scene";

interface SceneViewProps {
  scene: Scene;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called while dragging in edit mode. Omit to disable dragging. */
  onMove?: (id: string, x: number, y: number) => void;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * 2D scene drawn as SVG in world units. +Y is up in the scene, so every
 * y is negated for SVG (whose y points down). The view is the Main
 * Camera's frame: 16 x 9 units centred on the camera.
 */
export function SceneView({ scene, selectedId, onSelect, onMove }: SceneViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const cam = cameraObject(scene);
  const cx = cam?.transform.x ?? 0;
  const cy = cam?.transform.y ?? 0;
  const left = cx - VIEW_WIDTH / 2;
  const top = -cy - VIEW_HEIGHT / 2;

  function worldPoint(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: -p.y };
  }

  function startDrag(e: React.PointerEvent, o: GameObject) {
    e.stopPropagation();
    onSelect(o.id);
    // The view follows the camera, so dragging it would move the view
    // under the cursor. Move it from the Inspector instead.
    if (!onMove || o.components.some((c) => c.type === "Camera")) return;
    const p = worldPoint(e);
    if (!p) return;
    drag.current = { id: o.id, dx: o.transform.x - p.x, dy: o.transform.y - p.y };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag.current || !onMove) return;
    const p = worldPoint(e);
    if (!p) return;
    onMove(drag.current.id, round(p.x + drag.current.dx), round(p.y + drag.current.dy));
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag.current) return;
    drag.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
  }

  // Grid lines on whole units across the visible area.
  const gridX: number[] = [];
  for (let x = Math.ceil(left); x <= left + VIEW_WIDTH; x++) gridX.push(x);
  const gridY: number[] = [];
  for (let y = Math.ceil(top); y <= top + VIEW_HEIGHT; y++) gridY.push(y);

  return (
    <svg
      ref={svgRef}
      viewBox={`${left} ${top} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="w-full h-full block bg-[#eef1f5] touch-none select-none"
      onPointerDown={() => onSelect(null)}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="img"
      aria-label="Scene view"
    >
      <g stroke="#d5dbe3" strokeWidth={1} vectorEffect="non-scaling-stroke">
        {gridX.map((x) => (
          <line
            key={`x${x}`}
            x1={x}
            x2={x}
            y1={top}
            y2={top + VIEW_HEIGHT}
            vectorEffect="non-scaling-stroke"
            stroke={x === 0 ? "#b8c2cf" : undefined}
          />
        ))}
        {gridY.map((y) => (
          <line
            key={`y${y}`}
            y1={y}
            y2={y}
            x1={left}
            x2={left + VIEW_WIDTH}
            vectorEffect="non-scaling-stroke"
            stroke={y === 0 ? "#b8c2cf" : undefined}
          />
        ))}
      </g>

      {scene.objects.map((o) =>
        o.active ? (
          <SceneObject
            key={o.id}
            object={o}
            selected={o.id === selectedId}
            draggable={!!onMove}
            onPointerDown={(e) => startDrag(e, o)}
          />
        ) : null
      )}
    </svg>
  );
}

function SceneObject({
  object: o,
  selected,
  draggable,
  onPointerDown,
}: {
  object: GameObject;
  selected: boolean;
  draggable: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { x, y, rotation, scaleX, scaleY } = o.transform;
  const sprite = o.components.find((c) => c.type === "SpriteRenderer");
  const text = o.components.find((c) => c.type === "Text");
  const collider = o.components.some((c) => c.type === "BoxCollider2D");
  const isCamera = o.components.some((c) => c.type === "Camera");

  // Rough text bounds for the selection box.
  const textW = text ? Math.max(1, text.text.length * text.fontSize * 0.55) : 1;
  const textH = text ? text.fontSize * 1.3 : 1;
  const boxW = sprite ? 1 : text ? textW : 0.6;
  const boxH = sprite ? 1 : text ? textH : 0.6;

  return (
    <g
      transform={`translate(${x} ${-y}) rotate(${-rotation}) scale(${scaleX} ${scaleY})`}
      onPointerDown={onPointerDown}
      className={draggable ? "cursor-move" : "cursor-pointer"}
    >
      {sprite?.type === "SpriteRenderer" &&
        (sprite.shape === "circle" ? (
          <circle r={0.5} fill={sprite.color} />
        ) : (
          <rect x={-0.5} y={-0.5} width={1} height={1} fill={sprite.color} />
        ))}

      {text?.type === "Text" && (
        <text
          fontSize={text.fontSize}
          fill={text.color}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {text.text}
        </text>
      )}

      {/* Empty objects (and the camera) get a small marker so they can be
          seen and grabbed. */}
      {!sprite && !text && (
        <g stroke={isCamera ? "#6b7280" : "#94a3b8"} vectorEffect="non-scaling-stroke">
          <rect
            x={-0.3}
            y={-0.3}
            width={0.6}
            height={0.6}
            fill="transparent"
            strokeDasharray={isCamera ? undefined : "0.08 0.08"}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {isCamera && (
            <text
              fontSize={0.28}
              fill="#6b7280"
              textAnchor="middle"
              dominantBaseline="central"
              stroke="none"
            >
              CAM
            </text>
          )}
        </g>
      )}

      {collider && selected && (
        <rect
          x={-0.5}
          y={-0.5}
          width={1}
          height={1}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {selected && (
        <rect
          x={-boxW / 2 - 0.06}
          y={-boxH / 2 - 0.06}
          width={boxW + 0.12}
          height={boxH + 0.12}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
