"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, FileCode2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, FieldHint } from "@/components/ui/Input";

type LinkOption = { id: string; title: string };

interface SlideshowFormProps {
  mode: "create" | "edit";
  lessons: LinkOption[];
  assignments: LinkOption[];
  initial?: {
    classDate: string;
    title: string;
    description: string | null;
    asyncNote: string | null;
    hasHtml: boolean;
    lessonIds: string[];
    assignmentIds: string[];
  };
  action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
}

export function SlideshowForm({
  mode,
  lessons,
  assignments,
  initial,
  action,
  submitLabel,
}: SlideshowFormProps) {
  const router = useRouter();
  const [classDate, setClassDate] = useState(initial?.classDate ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [asyncNote, setAsyncNote] = useState(initial?.asyncNote ?? "");
  const [lessonIds, setLessonIds] = useState<Set<string>>(
    new Set(initial?.lessonIds ?? [])
  );
  const [assignmentIds, setAssignmentIds] = useState<Set<string>>(
    new Set(initial?.assignmentIds ?? [])
  );
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function toggle(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    id: string
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function submit() {
    if (!classDate) {
      setMsg({ text: "Pick a date.", error: true });
      return;
    }
    if (!title.trim()) {
      setMsg({ text: "Title required.", error: true });
      return;
    }
    setMsg(null);

    const fd = new FormData();
    fd.set("class_date", classDate);
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    fd.set("async_note", asyncNote.trim());
    for (const id of lessonIds) fd.append("lesson_ids", id);
    for (const id of assignmentIds) fd.append("assignment_ids", id);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("html_file", file);

    start(async () => {
      const r = await action(fd);
      if (r.ok) {
        setMsg({
          text: mode === "create" ? "Slideshow created." : "Saved.",
          error: false,
        });
        if (mode === "create") {
          setClassDate("");
          setTitle("");
          setDescription("");
          setAsyncNote("");
          setLessonIds(new Set());
          setAssignmentIds(new Set());
          if (fileRef.current) fileRef.current.value = "";
        }
        router.refresh();
      } else {
        setMsg({ text: r.error ?? "Something went wrong", error: true });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ss-date">Class date</Label>
          <Input
            id="ss-date"
            type="date"
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ss-title">Title</Label>
          <Input
            id="ss-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Intro to game loops"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ss-desc">
          Agenda — what we&apos;re doing{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="ss-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short note shown on the dashboard."
        />
      </div>

      <div>
        <Label htmlFor="ss-async">
          Period 3 — async work{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="ss-async"
          rows={2}
          value={asyncNote}
          onChange={(e) => setAsyncNote(e.target.value)}
          placeholder="What students should work on during the Personalized Learning block."
        />
      </div>

      <div>
        <Label htmlFor="ss-file">
          Slideshow HTML{" "}
          {mode === "edit" && (
            <span className="text-wood-500 font-normal">
              (leave empty to keep the current file)
            </span>
          )}
        </Label>
        <div className="flex items-start gap-3 p-3 rounded-cozy border border-dashed border-wood-300 bg-cream-50">
          <FileCode2
            className="w-6 h-6 text-wood-400 flex-shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <div className="flex-1 min-w-0">
            <Input
              id="ss-file"
              ref={fileRef}
              type="file"
              accept=".html,text/html"
              className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:text-terracotta-800 file:text-xs file:font-medium hover:file:bg-terracotta-200 file:cursor-pointer"
            />
            {mode === "edit" && initial?.hasHtml && (
              <FieldHint>A slideshow file is already uploaded.</FieldHint>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LinkPicker
          label="Linked lessons"
          options={lessons}
          selected={lessonIds}
          onToggle={(id) => toggle(lessonIds, setLessonIds, id)}
        />
        <LinkPicker
          label="Linked assignments"
          options={assignments}
          selected={assignmentIds}
          onToggle={(id) => toggle(assignmentIds, setAssignmentIds, id)}
        />
      </div>

      {msg && (
        <p
          className={[
            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-cozy border",
            msg.error
              ? "bg-terracotta-50 border-terracotta-200 text-terracotta-800"
              : "bg-sage-50 border-sage-200 text-sage-800",
          ].join(" ")}
        >
          {msg.error ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {msg.text}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={isPending} size="sm">
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function LinkPicker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: LinkOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-wood-500 italic mt-1">None available yet.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-cozy border border-wood-200 bg-white divide-y divide-wood-100">
          {options.map((o) => (
            <label
              key={o.id}
              className="flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-cream-100"
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => onToggle(o.id)}
                className="w-3.5 h-3.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400 flex-shrink-0"
              />
              <span className="truncate text-wood-800">{o.title}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
