"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Link2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Textarea,
  Select,
  FieldHint,
  FieldError,
} from "@/components/ui/Input";
import { ASSET_CATEGORIES } from "@/lib/assets";
import { createAsset } from "@/app/assets/actions";

type Mode = "file" | "link";

/**
 * Expandable "Add an asset" form. Teachers can upload a file or add a
 * link; students can add links only.
 */
export function AddAssetPanel({ isTeacher }: { isTeacher: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(isTeacher ? "file" : "link");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setBusy(true);
    try {
      const result = await createAsset(new FormData(form));
      if (result.ok) {
        form.reset();
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-6">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          {isTeacher ? "Add an asset" : "Share a link"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-wood-900">
          {isTeacher ? "Add an asset" : "Share an asset link"}
        </h2>
        <button
          type="button"
          onClick={close}
          className="rounded-cozy p-1 text-wood-500 transition-colors hover:bg-cream-200"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Teachers choose upload vs. link; students only ever link. */}
      {isTeacher && (
        <div className="mb-4 inline-flex rounded-cozy border border-wood-200 p-0.5">
          <ModeTab
            active={mode === "file"}
            onClick={() => setMode("file")}
            icon={<Upload className="h-3.5 w-3.5" />}
            label="Upload a file"
          />
          <ModeTab
            active={mode === "link"}
            onClick={() => setMode("link")}
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Add a link"
          />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="asset-title">Title</Label>
            <Input
              id="asset-title"
              name="title"
              placeholder="e.g. Pixel platformer tileset"
              maxLength={120}
              disabled={busy}
              required
            />
          </div>
          <div>
            <Label htmlFor="asset-category">Category</Label>
            <Select
              id="asset-category"
              name="category"
              defaultValue="sprites"
              disabled={busy}
            >
              {ASSET_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="asset-description">Description</Label>
          <Textarea
            id="asset-description"
            name="description"
            rows={2}
            maxLength={600}
            placeholder="What is it, and what's it good for?"
            disabled={busy}
          />
        </div>

        {mode === "file" ? (
          <div>
            <Label htmlFor="asset-file">File</Label>
            <Input
              id="asset-file"
              name="file"
              type="file"
              disabled={busy}
              required
              className="text-sm file:mr-3 file:rounded-cozy file:border-0 file:bg-terracotta-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-terracotta-800 hover:file:bg-terracotta-200 file:cursor-pointer"
            />
            <FieldHint>
              Sprites, sound clips, small templates — up to 25 MB. Bigger than
              that? Add it as a link instead.
            </FieldHint>
          </div>
        ) : (
          <div>
            <Label htmlFor="asset-url">Link</Label>
            <Input
              id="asset-url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://assetstore.unity.com/..."
              disabled={busy}
              required
            />
            <FieldHint>
              Unity Asset Store, itch.io, OpenGameArt — anywhere the asset
              lives.
            </FieldHint>
          </div>
        )}

        {error && <FieldError>{error}</FieldError>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add to library"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-terracotta-100 text-terracotta-800"
          : "text-wood-600 hover:bg-cream-100",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
