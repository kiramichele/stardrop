"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { Upload, FileArchive, ImageIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Label,
  Textarea,
  FieldHint,
  FieldError,
} from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { findBuildRoot, collectBuildFiles, mimeForPath } from "@/lib/showcase";
import {
  createShowcaseProject,
  finalizeShowcaseProject,
} from "@/app/showcase/actions";

const MAX_ZIP_BYTES = 200 * 1024 * 1024;
const SHOWCASE_BUCKET = "showcase";

export function ProjectUploadForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Remembered across a retry so a failed upload doesn't strand a new draft.
  const created = useRef<{ projectId: string; storagePrefix: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Give your project a title.");
      return;
    }
    if (!zipFile) {
      setError("Choose your Unity WebGL build .zip file.");
      return;
    }
    if (zipFile.size > MAX_ZIP_BYTES) {
      setError(
        "That zip is over 200 MB. Build with Brotli compression to shrink it."
      );
      return;
    }

    setBusy(true);
    try {
      setStatus("Reading your build…");
      const zip = await JSZip.loadAsync(zipFile);
      const paths = Object.keys(zip.files);

      const buildRoot = findBuildRoot(paths);
      if (buildRoot === null) {
        throw new Error(
          "Couldn't find index.html in that zip. Zip the whole WebGL " +
            "build folder — the one with index.html and the Build folder inside."
        );
      }
      const files = collectBuildFiles(paths, buildRoot);
      if (files.length === 0) throw new Error("That zip looks empty.");

      // Create the draft row (or reuse it if a previous try got this far).
      if (!created.current) {
        const result = await createShowcaseProject(cleanTitle, description);
        if (!result.ok) throw new Error(result.error);
        created.current = {
          projectId: result.projectId,
          storagePrefix: result.storagePrefix,
        };
      }
      const { projectId, storagePrefix } = created.current;

      const supabase = createClient();
      const total = files.length + (thumbFile ? 1 : 0);
      let done = 0;
      setProgress({ done, total });

      for (const file of files) {
        const entry = zip.files[file.zipPath];
        if (!entry) continue;
        setStatus(`Uploading ${file.relativePath}…`);
        const blob = await entry.async("blob");
        const { error: upErr } = await supabase.storage
          .from(SHOWCASE_BUCKET)
          .upload(`${storagePrefix}/${file.relativePath}`, blob, {
            contentType: mimeForPath(file.relativePath),
            upsert: true,
          });
        if (upErr) {
          throw new Error(
            `Upload failed on ${file.relativePath}: ${upErr.message}`
          );
        }
        done += 1;
        setProgress({ done, total });
      }

      let thumbnailPath: string | null = null;
      if (thumbFile) {
        setStatus("Uploading cover image…");
        const ext = (thumbFile.name.split(".").pop() ?? "png").toLowerCase();
        thumbnailPath = `${storagePrefix}/_thumbnail.${ext}`;
        const { error: thumbErr } = await supabase.storage
          .from(SHOWCASE_BUCKET)
          .upload(thumbnailPath, thumbFile, {
            contentType: thumbFile.type || mimeForPath(thumbnailPath),
            upsert: true,
          });
        if (thumbErr) {
          throw new Error(`Cover image upload failed: ${thumbErr.message}`);
        }
        done += 1;
        setProgress({ done, total });
      }

      setStatus("Finishing up…");
      const finalized = await finalizeShowcaseProject(
        projectId,
        `${storagePrefix}/index.html`,
        files.length,
        thumbnailPath
      );
      if (!finalized.ok) {
        throw new Error(finalized.error ?? "Couldn't finish the upload.");
      }

      router.push(`/showcase/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const pct =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="max-w-2xl animate-fade-in-up">
      {/* How-to box */}
      <div className="rounded-cozy-lg border border-honey-200 bg-honey-50 p-5 mb-6">
        <p className="label-eyebrow text-honey-700">Before you upload</p>
        <ol className="mt-2 space-y-1.5 text-sm text-wood-700 list-decimal list-inside">
          <li>
            In Unity: <strong>File → Build Settings → WebGL → Build</strong>.
          </li>
          <li>
            For a smooth upload, set{" "}
            <strong>Player Settings → Publishing Settings</strong> →
            Compression Format to <strong>Disabled</strong>, or to{" "}
            <strong>Brotli</strong> with <strong>Decompression Fallback</strong>{" "}
            checked.
          </li>
          <li>
            Zip the build <strong>output folder</strong> — the one that
            contains <code className="text-xs">index.html</code> and the{" "}
            <code className="text-xs">Build</code> folder.
          </li>
          <li>Pick that .zip below and upload. 🎮</li>
        </ol>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="sc-title">Project title</Label>
            <Input
              id="sc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Starlight Runner"
              maxLength={120}
              disabled={busy}
              required
            />
          </div>

          <div>
            <Label htmlFor="sc-desc">Description</Label>
            <Textarea
              id="sc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your game about? How do you play it? Any controls to know?"
              rows={4}
              maxLength={2000}
              disabled={busy}
            />
            <FieldHint>Optional, but it helps classmates know what to try.</FieldHint>
          </div>

          <div>
            <Label htmlFor="sc-zip">Unity WebGL build (.zip)</Label>
            <label
              htmlFor="sc-zip"
              className={[
                "flex items-center gap-3 rounded-cozy border border-dashed px-4 py-3 cursor-pointer transition-colors",
                busy
                  ? "border-wood-200 bg-cream-100 cursor-not-allowed"
                  : "border-wood-300 bg-cream-50 hover:border-terracotta-400 hover:bg-cream-100",
              ].join(" ")}
            >
              <FileArchive
                className="w-5 h-5 text-terracotta-600 flex-shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-sm text-wood-700 truncate">
                {zipFile ? zipFile.name : "Choose your build .zip…"}
              </span>
            </label>
            <input
              id="sc-zip"
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={busy}
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Label htmlFor="sc-thumb">Cover image</Label>
            <label
              htmlFor="sc-thumb"
              className={[
                "flex items-center gap-3 rounded-cozy border border-dashed px-4 py-3 cursor-pointer transition-colors",
                busy
                  ? "border-wood-200 bg-cream-100 cursor-not-allowed"
                  : "border-wood-300 bg-cream-50 hover:border-terracotta-400 hover:bg-cream-100",
              ].join(" ")}
            >
              <ImageIcon
                className="w-5 h-5 text-sage-600 flex-shrink-0"
                strokeWidth={1.75}
              />
              <span className="text-sm text-wood-700 truncate">
                {thumbFile ? thumbFile.name : "Choose a screenshot (optional)…"}
              </span>
            </label>
            <input
              id="sc-thumb"
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            />
            <FieldHint>A screenshot makes your project pop in the gallery.</FieldHint>
          </div>

          {error && <FieldError>{error}</FieldError>}

          {busy && (
            <div className="rounded-cozy bg-cream-100 border border-wood-100 p-4">
              <div className="flex items-center gap-2 text-sm text-wood-700">
                <Loader2 className="w-4 h-4 animate-spin text-terracotta-600" />
                <span className="truncate">{status}</span>
              </div>
              {progress.total > 0 && (
                <>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-300">
                    <div
                      className="h-full rounded-full bg-terracotta-400 transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-wood-500 mt-1">
                    {progress.done} / {progress.total} files
                  </p>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              <Upload className="w-4 h-4" />
              {busy ? "Uploading…" : "Upload project"}
            </Button>
            {!busy && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/showcase")}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
