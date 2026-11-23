"use client";

import { useState, type ReactNode } from "react";
import { Trash2, X, FileCode2, AlertTriangle } from "lucide-react";
import {
  ADDABLE_COMPONENTS,
  COMPONENT_LABELS,
  parsePublicFields,
  resolvedFieldValues,
  scriptClassName,
  type Component,
  type ComponentType,
  type FieldValue,
  type GameObject,
  type Script,
  type Transform,
} from "@/lib/unity-lab/scene";
import { PanelHeader } from "./PanelHeader";

interface InspectorPanelProps {
  object: GameObject | null;
  scripts: Script[];
  /** False in Play mode: everything is shown but nothing can change. */
  editable: boolean;
  onChange: (update: (o: GameObject) => GameObject) => void;
  onDelete: () => void;
  onAddComponent: (type: Exclude<ComponentType, "Script" | "Camera">) => void;
  onNewScript: () => void;
  onAttachScript: (scriptId: string) => void;
  onEditScript: (scriptId: string) => void;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const { object, editable } = props;
  return (
    <div className="flex flex-col h-full min-h-0">
      <PanelHeader title="Inspector" />
      <div className="flex-1 overflow-y-auto">
        {!object ? (
          <p className="p-3 text-xs text-wood-500">
            Select a GameObject in the Hierarchy or Scene to see its components here.
          </p>
        ) : (
          <fieldset disabled={!editable} className="min-w-0">
            <InspectorBody {...props} object={object} />
          </fieldset>
        )}
      </div>
    </div>
  );
}

function InspectorBody({
  object: o,
  scripts,
  editable,
  onChange,
  onDelete,
  onAddComponent,
  onNewScript,
  onAttachScript,
  onEditScript,
}: InspectorPanelProps & { object: GameObject }) {
  const setTransform = (patch: Partial<Transform>) =>
    onChange((obj) => ({ ...obj, transform: { ...obj.transform, ...patch } }));

  const setComponent = (index: number, next: Component) =>
    onChange((obj) => ({
      ...obj,
      components: obj.components.map((c, i) => (i === index ? next : c)),
    }));

  const removeComponent = (index: number) =>
    onChange((obj) => ({
      ...obj,
      components: obj.components.filter((_, i) => i !== index),
    }));

  const scriptsById = new Map(scripts.map((s) => [s.id, s]));
  const present = new Set(o.components.map((c) => c.type));
  const attachedScripts = new Set(
    o.components.flatMap((c) => (c.type === "Script" ? [c.scriptId] : []))
  );

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-wood-100">
        <input
          type="checkbox"
          checked={o.active}
          onChange={(e) => onChange((obj) => ({ ...obj, active: e.target.checked }))}
          aria-label="Active"
          title="Active — inactive objects are hidden and their scripts don't run"
          className="w-4 h-4 rounded border-wood-300"
        />
        <input
          value={o.name}
          maxLength={60}
          onChange={(e) => onChange((obj) => ({ ...obj, name: e.target.value }))}
          aria-label="Name"
          className="flex-1 min-w-0 rounded border border-wood-200 bg-white px-2 py-1 text-sm"
        />
        {editable && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-wood-400 hover:text-terracotta-700 hover:bg-cream-200"
            aria-label="Delete GameObject"
            title="Delete GameObject"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <Section title="Transform">
        <Row label="Position">
          <NumberField label="X" value={o.transform.x} onChange={(x) => setTransform({ x })} />
          <NumberField label="Y" value={o.transform.y} onChange={(y) => setTransform({ y })} />
        </Row>
        <Row label="Rotation">
          <NumberField label="Z" value={o.transform.rotation} step={5} onChange={(rotation) => setTransform({ rotation })} />
        </Row>
        <Row label="Scale">
          <NumberField label="X" value={o.transform.scaleX} onChange={(scaleX) => setTransform({ scaleX })} />
          <NumberField label="Y" value={o.transform.scaleY} onChange={(scaleY) => setTransform({ scaleY })} />
        </Row>
      </Section>

      {o.components.map((c, i) => {
        if (c.type === "Script") {
          const script = scriptsById.get(c.scriptId);
          const code = script?.code ?? "";
          const className = scriptClassName(code);
          const fields = parsePublicFields(code);
          const values = resolvedFieldValues(fields, c.fields);
          return (
            <Section
              key={`${c.type}-${c.scriptId}`}
              title={`${className ?? "Script"} (Script)`}
              onRemove={editable ? () => removeComponent(i) : undefined}
              action={
                <button
                  type="button"
                  onClick={() => onEditScript(c.scriptId)}
                  className="flex items-center gap-1 text-xs text-sky-800 hover:underline"
                >
                  <FileCode2 className="w-3.5 h-3.5" /> Edit
                </button>
              }
            >
              {!className && (
                <p className="flex items-center gap-1.5 text-xs text-honey-800">
                  <AlertTriangle className="w-3.5 h-3.5" /> No class found in this script.
                </p>
              )}
              {fields.length === 0 ? (
                <p className="text-xs text-wood-500">
                  No public fields. Add one (e.g. <code>public float speed = 5f;</code>) to
                  tweak it here.
                </p>
              ) : (
                fields.map((f) => (
                  <Row key={f.name} label={niceName(f.name)}>
                    <FieldInput
                      type={f.type}
                      value={values[f.name]}
                      onChange={(v) =>
                        setComponent(i, { ...c, fields: { ...c.fields, [f.name]: v } })
                      }
                    />
                  </Row>
                ))
              )}
            </Section>
          );
        }

        return (
          <Section
            key={c.type}
            title={COMPONENT_LABELS[c.type]}
            onRemove={editable ? () => removeComponent(i) : undefined}
          >
            {c.type === "Camera" && (
              <p className="text-xs text-wood-500">
                The Scene view shows what this camera sees. Move it to look around.
              </p>
            )}
            {c.type === "SpriteRenderer" && (
              <>
                <Row label="Color">
                  <ColorField value={c.color} onChange={(color) => setComponent(i, { ...c, color })} />
                </Row>
                <Row label="Shape">
                  <select
                    value={c.shape}
                    onChange={(e) =>
                      setComponent(i, { ...c, shape: e.target.value === "circle" ? "circle" : "square" })
                    }
                    className="flex-1 rounded border border-wood-200 bg-white px-1.5 py-0.5 text-sm"
                  >
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </Row>
              </>
            )}
            {c.type === "Text" && (
              <>
                <Row label="Text">
                  <input
                    value={c.text}
                    maxLength={500}
                    onChange={(e) => setComponent(i, { ...c, text: e.target.value })}
                    className="flex-1 min-w-0 rounded border border-wood-200 bg-white px-1.5 py-0.5 text-sm"
                  />
                </Row>
                <Row label="Font Size">
                  <NumberField value={c.fontSize} step={0.1} onChange={(fontSize) => setComponent(i, { ...c, fontSize })} />
                </Row>
                <Row label="Color">
                  <ColorField value={c.color} onChange={(color) => setComponent(i, { ...c, color })} />
                </Row>
              </>
            )}
            {c.type === "Rigidbody2D" && (
              <Row label="Gravity Scale">
                <NumberField value={c.gravityScale} onChange={(gravityScale) => setComponent(i, { ...c, gravityScale })} />
              </Row>
            )}
            {c.type === "BoxCollider2D" && (
              <p className="text-xs text-wood-500">Uses the object&apos;s size (shown in green when selected).</p>
            )}
          </Section>
        );
      })}

      {editable && (
        <div className="p-3">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              if (v === "__new_script") onNewScript();
              else if (v.startsWith("script:")) onAttachScript(v.slice(7));
              else if (v) onAddComponent(v as Exclude<ComponentType, "Script" | "Camera">);
            }}
            className="w-full rounded-cozy border border-wood-300 bg-cream-50 px-2 py-1.5 text-sm text-wood-800"
            aria-label="Add Component"
          >
            <option value="">Add Component…</option>
            <optgroup label="Components">
              {ADDABLE_COMPONENTS.filter((t) => !present.has(t)).map((t) => (
                <option key={t} value={t}>
                  {COMPONENT_LABELS[t]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Scripts">
              <option value="__new_script">New script…</option>
              {scripts
                .filter((s) => !attachedScripts.has(s.id))
                .map((s) => (
                  <option key={s.id} value={`script:${s.id}`}>
                    {scriptClassName(s.code) ?? "Untitled script"}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}

/** "jumpForce" → "Jump Force", like Unity's Inspector labels. */
function niceName(name: string): string {
  const spaced = name.replace(/^_+/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function Section({
  title,
  children,
  onRemove,
  action,
}: {
  title: string;
  children: ReactNode;
  onRemove?: () => void;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-wood-100 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-wood-800 truncate">{title}</h4>
        <div className="flex items-center gap-1.5">
          {action}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-0.5 rounded text-wood-400 hover:text-terracotta-700 hover:bg-cream-200"
              aria-label={`Remove ${title}`}
              title="Remove component"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 flex-shrink-0 text-xs text-wood-600 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Number input that tolerates half-typed values ("-", "1.") by keeping a
 * local draft and only reporting parseable numbers.
 */
function NumberField({
  value,
  onChange,
  label,
  step = 0.1,
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
  step?: number;
}) {
  const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
  // While typing, show the draft; otherwise follow the live value (so
  // dragging in the Scene view or playback updates the field).
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? fmt(value);

  return (
    <label className="flex-1 min-w-0 flex items-center gap-1">
      {label && <span className="text-[11px] text-wood-500 w-2.5">{label}</span>}
      <input
        type="number"
        step={step}
        value={shown}
        onFocus={() => setDraft(fmt(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number.parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full min-w-0 rounded border border-wood-200 bg-white px-1.5 py-0.5 text-sm tabular-nums"
      />
    </label>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-10 rounded border border-wood-200 bg-white p-0"
        aria-label="Color"
      />
      <span className="text-xs font-mono text-wood-500">{value}</span>
    </span>
  );
}

function FieldInput({
  type,
  value,
  onChange,
}: {
  type: "int" | "float" | "string" | "bool";
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}) {
  if (type === "bool") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-wood-300"
      />
    );
  }
  if (type === "string") {
    return (
      <input
        value={String(value)}
        maxLength={500}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 rounded border border-wood-200 bg-white px-1.5 py-0.5 text-sm"
      />
    );
  }
  return (
    <NumberField
      value={typeof value === "number" ? value : 0}
      step={type === "int" ? 1 : 0.1}
      onChange={(n) => onChange(type === "int" ? Math.trunc(n) : n)}
    />
  );
}
