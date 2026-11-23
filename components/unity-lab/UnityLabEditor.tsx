"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Square as StopIcon,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
  Monitor,
} from "lucide-react";
import {
  MAX_OBJECTS,
  MAX_SCRIPTS,
  MAX_TITLE_CHARS,
  isValidClassName,
  makeComponent,
  makeObject,
  newId,
  scriptClassName,
  scriptStarter,
  type ComponentType,
  type GameObject,
  type ObjectPreset,
  type Scene,
} from "@/lib/unity-lab/scene";
import {
  MAX_SCENARIO_CHARS,
  SIM_SECONDS,
  buildTracks,
  sceneAt,
  type SimulationResult,
} from "@/lib/unity-lab/simulation";
import { saveScene, simulateScene } from "@/app/unity-lab/actions";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./InspectorPanel";
import { SceneView } from "./SceneView";
import { BottomPanel, type BottomTab } from "./BottomPanel";
import { PanelHeader } from "./PanelHeader";

type Mode = "edit" | "simulating" | "playing";

interface UnityLabEditorProps {
  sceneId: string;
  initialTitle: string;
  initialScene: Scene;
  simulationEnabled: boolean;
}

const AUTOSAVE_MS = 1200;

export function UnityLabEditor({
  sceneId,
  initialTitle,
  initialScene,
  simulationEnabled,
}: UnityLabEditorProps) {
  const [scene, setScene] = useState<Scene>(initialScene);
  const [title, setTitle] = useState(initialTitle);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialScene.objects.find((o) => o.components.some((c) => c.type === "Script"))?.id ??
      null
  );
  const [tab, setTab] = useState<BottomTab>("script");
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");

  const [mode, setMode] = useState<Mode>("edit");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState(0);

  const editable = mode === "edit";

  // ---------------------------------------------------------------
  // Autosave
  // ---------------------------------------------------------------
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setSaveState("saving");
      const r = await saveScene(sceneId, { title: title.trim() || "Untitled scene", scene });
      if (r.ok) {
        setSaveState("saved");
        setSaveError(null);
      } else {
        setSaveState("error");
        setSaveError(r.error ?? "Couldn't save");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [scene, title, sceneId]);

  // ---------------------------------------------------------------
  // Editing helpers (no-ops outside edit mode)
  // ---------------------------------------------------------------
  const update = useCallback(
    (fn: (s: Scene) => Scene) => {
      if (mode !== "edit") return;
      setScene(fn);
    },
    [mode]
  );

  const updateObject = useCallback(
    (id: string, fn: (o: GameObject) => GameObject) =>
      update((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? fn(o) : o)) })),
    [update]
  );

  function addObject(preset: ObjectPreset) {
    if (scene.objects.length >= MAX_OBJECTS) {
      alert(`A scene can have at most ${MAX_OBJECTS} objects.`);
      return;
    }
    const obj = makeObject(preset, scene.objects);
    update((s) => ({ ...s, objects: [...s.objects, obj] }));
    setSelectedId(obj.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    update((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== selectedId) }));
    setSelectedId(null);
  }

  function addComponent(type: Exclude<ComponentType, "Script" | "Camera">) {
    if (!selectedId) return;
    updateObject(selectedId, (o) => ({ ...o, components: [...o.components, makeComponent(type)] }));
  }

  function attachScript(scriptId: string) {
    if (!selectedId) return;
    updateObject(selectedId, (o) => ({
      ...o,
      components: [...o.components, { type: "Script", scriptId, fields: {} }],
    }));
    setActiveScriptId(scriptId);
    setTab("script");
  }

  function newScript() {
    if (!selectedId) return;
    if (scene.scripts.length >= MAX_SCRIPTS) {
      alert(`A scene can have at most ${MAX_SCRIPTS} scripts.`);
      return;
    }
    const raw = prompt("Name your script (like PlayerMove — letters and numbers, no spaces):");
    if (raw === null) return;
    const name = raw.trim();
    if (!isValidClassName(name)) {
      alert("Script names must start with a letter and use only letters, numbers and _ (no spaces).");
      return;
    }
    if (scene.scripts.some((s) => scriptClassName(s.code) === name)) {
      alert(`There's already a script called ${name}. Pick it from Add Component instead.`);
      return;
    }
    const id = newId();
    update((s) => ({ ...s, scripts: [...s.scripts, { id, code: scriptStarter(name) }] }));
    attachScript(id);
  }

  function changeScript(id: string, code: string) {
    update((s) => ({
      ...s,
      scripts: s.scripts.map((sc) => (sc.id === id ? { ...sc, code } : sc)),
    }));
  }

  // ---------------------------------------------------------------
  // Play / Stop
  // ---------------------------------------------------------------
  const tracks = useMemo(() => (result ? buildTracks(result.timeline) : null), [result]);

  async function play() {
    setMode("simulating");
    setSimError(null);
    setResult(null);
    setPlayTime(0);
    setTab("console");
    const r = await simulateScene(sceneId, { scene, scenario });
    if (!r.ok) {
      setSimError(r.error);
      setMode("edit");
      setTab("simulation");
      return;
    }
    setResult(r.result);
    if (r.result.compileErrors.length > 0) {
      // Like Unity: compile errors keep you out of Play mode.
      setMode("edit");
      return;
    }
    setMode("playing");
  }

  function stop() {
    setMode("edit");
    setPlayTime(0);
  }

  // Advance the play clock while playing.
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const runClock = useCallback(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(SIM_SECONDS, (now - startRef.current) / 1000);
      setPlayTime(t);
      if (t < SIM_SECONDS) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (mode !== "playing") return;
    runClock();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, runClock]);

  function replay() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setPlayTime(0);
    runClock();
  }

  // What's on screen: the edit scene, or the scene at the current play time.
  const shown = mode === "playing" && tracks ? sceneAt(scene, tracks, playTime) : scene;
  const selected = shown.objects.find((o) => o.id === selectedId) ?? null;
  const consoleEntries =
    result && mode === "playing"
      ? result.console.filter((e) => e.time <= playTime)
      : result?.console ?? [];

  const playing = mode === "playing";
  const finished = playing && playTime >= SIM_SECONDS;

  return (
    <>
      <div className="lg:hidden">
        <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
          <Monitor className="w-8 h-8 text-wood-400" />
          <p className="font-display text-lg text-wood-800">Unity Lab needs a bigger screen</p>
          <p className="text-sm text-wood-600 max-w-sm">
            Open this page on a laptop or desktop computer to build and play your scene.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-col gap-3">
        {/* Toolbar */}
        <div
          className={`flex items-center gap-3 rounded-cozy border px-3 py-2 transition-colors ${
            playing ? "bg-sky-100 border-sky-300" : "bg-cream-50 border-wood-200"
          }`}
        >
          <Link
            href="/unity-lab"
            className="p-1 rounded text-wood-500 hover:text-wood-800 hover:bg-cream-200"
            aria-label="All scenes"
            title="All scenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            value={title}
            maxLength={MAX_TITLE_CHARS}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!editable}
            aria-label="Scene name"
            className="w-48 rounded border border-transparent hover:border-wood-200 focus:border-wood-300 bg-transparent px-2 py-1 font-display text-lg text-wood-900"
          />
          <input
            value={scenario}
            maxLength={MAX_SCENARIO_CHARS}
            onChange={(e) => setScenario(e.target.value)}
            disabled={!editable}
            placeholder="Player input (optional) — e.g. holds Right arrow, presses Space at 2s"
            aria-label="Player input"
            className="flex-1 min-w-0 rounded border border-wood-200 bg-white px-2 py-1 text-sm"
          />

          <div className="flex items-center gap-1.5">
            {mode === "edit" && (
              <button
                type="button"
                onClick={play}
                disabled={!simulationEnabled}
                title={simulationEnabled ? "Play" : "Simulation is turned off by your teacher"}
                className="flex items-center gap-1.5 rounded-cozy bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4" fill="currentColor" /> Play
              </button>
            )}
            {mode === "simulating" && (
              <span className="flex items-center gap-1.5 rounded-cozy bg-sky-600/80 px-3 py-1.5 text-sm font-medium text-white">
                <Loader2 className="w-4 h-4 animate-spin" /> Simulating…
              </span>
            )}
            {playing && (
              <>
                <button
                  type="button"
                  onClick={replay}
                  className="flex items-center gap-1.5 rounded-cozy border border-sky-300 bg-white px-2.5 py-1.5 text-sm text-sky-900 hover:bg-sky-50"
                  title="Play the simulation again"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
                <button
                  type="button"
                  onClick={stop}
                  className="flex items-center gap-1.5 rounded-cozy bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  <StopIcon className="w-4 h-4" fill="currentColor" /> Stop
                </button>
              </>
            )}
          </div>

          <SaveStatus state={saveState} error={saveError} />
        </div>

        {!simulationEnabled && (
          <p className="text-xs text-honey-800 bg-honey-50 border border-honey-200 rounded-cozy px-3 py-1.5">
            Play is turned off right now — your teacher has paused the AI simulation. You can still
            build your scene and write scripts.
          </p>
        )}
        {playing && (
          <p className="text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-cozy px-3 py-1.5">
            <strong>Play mode.</strong> In Unity, changes you make while playing are thrown away
            when you press Stop — so editing is paused here. Press Stop to go back to editing.
          </p>
        )}

        {/* Hierarchy | Scene | Inspector */}
        <div className="grid grid-cols-[190px_minmax(0,1fr)_270px] gap-3 h-[420px]">
          <Panel>
            <HierarchyPanel
              objects={shown.objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAdd={editable ? addObject : undefined}
            />
          </Panel>

          <Panel className={playing ? "ring-2 ring-sky-400" : ""}>
            <PanelHeader title={playing ? "Game" : "Scene"}>
              {playing && (
                <span className="flex items-center gap-2 text-xs text-sky-900 tabular-nums">
                  {finished ? "Done" : "Playing"} · {playTime.toFixed(1)}s / {SIM_SECONDS}s
                </span>
              )}
            </PanelHeader>
            <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#eef1f5]">
              <div className="w-full aspect-video max-h-full">
                <SceneView
                  scene={shown}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onMove={
                    editable
                      ? (id, x, y) =>
                          updateObject(id, (o) => ({ ...o, transform: { ...o.transform, x, y } }))
                      : undefined
                  }
                />
              </div>
              {playing && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-100">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${(playTime / SIM_SECONDS) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <InspectorPanel
              object={selected}
              scripts={scene.scripts}
              editable={editable}
              onChange={(fn) => selectedId && updateObject(selectedId, fn)}
              onDelete={deleteSelected}
              onAddComponent={addComponent}
              onNewScript={newScript}
              onAttachScript={attachScript}
              onEditScript={(id) => {
                setActiveScriptId(id);
                setTab("script");
              }}
            />
          </Panel>
        </div>

        {/* Script | Console | Simulation */}
        <Panel className="h-[380px]">
          <BottomPanel
            tab={tab}
            onTab={setTab}
            selected={selected}
            scripts={scene.scripts}
            activeScriptId={activeScriptId}
            onActiveScript={setActiveScriptId}
            onScriptChange={changeScript}
            editable={editable}
            consoleEntries={consoleEntries}
            compileErrors={result?.compileErrors ?? []}
            result={result}
            simulating={mode === "simulating"}
            simError={simError}
          />
        </Panel>
      </div>
    </>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col min-h-0 rounded-cozy border border-wood-200 bg-cream-50 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function SaveStatus({
  state,
  error,
}: {
  state: "idle" | "saving" | "saved" | "error";
  error: string | null;
}) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-wood-500 w-20 justify-end">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-terracotta-700 max-w-40 truncate" title={error ?? ""}>
        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error ?? "Not saved"}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-wood-500 w-20 justify-end">
      {state === "saved" && (
        <>
          <Check className="w-3 h-3" /> Saved
        </>
      )}
    </span>
  );
}
