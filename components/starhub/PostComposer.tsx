"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Send,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { SubmissionMedia } from "@/lib/assignments";
import { createPost } from "@/app/starhub/actions";

const STARHUB_BUCKET = "starhub";

type Pending = {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
};

function extFor(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (fromName) return fromName;
  const m = file.type;
  if (m.includes("png")) return "png";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("quicktime")) return "mov";
  return m.startsWith("video/") ? "webm" : "bin";
}

export function PostComposer({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => pending.forEach((p) => URL.revokeObjectURL(p.url)),
    // clean up object URLs on unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function addFiles(files: File[]) {
    const next: Pending[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      next.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        kind: isVideo ? "video" : "image",
      });
    }
    if (next.length > 0) setPending((p) => [...p, ...next]);
  }

  function removePending(id: string) {
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return p.filter((x) => x.id !== id);
    });
  }

  async function submit() {
    if (uploading) return;
    if (!body.trim() && pending.length === 0) {
      setError("Add some text or at least one photo/video.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const postId = crypto.randomUUID();
      const supabase = createClient();
      const media: SubmissionMedia[] = [];

      for (const p of pending) {
        const fileId = crypto.randomUUID();
        const storagePath = `${userId}/${postId}/${fileId}.${extFor(p.file)}`;
        const { error: upErr } = await supabase.storage
          .from(STARHUB_BUCKET)
          .upload(storagePath, p.file, {
            contentType: p.file.type || undefined,
            upsert: true,
          });
        if (upErr) {
          setError(`Upload failed: ${upErr.message}`);
          setUploading(false);
          return;
        }
        media.push({
          id: fileId,
          kind: p.kind,
          storagePath,
          mime: p.file.type || (p.kind === "video" ? "video/webm" : "image/png"),
          size: p.file.size,
          createdAt: new Date().toISOString(),
          bucket: STARHUB_BUCKET,
        });
      }

      const result = await createPost({ body, media, isPublic });
      if (!result.ok) {
        setError(result.error);
        setUploading(false);
        return;
      }

      pending.forEach((p) => URL.revokeObjectURL(p.url));
      router.push(`/starhub/${username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post.");
      setUploading(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say something about what you're sharing… (optional)"
        rows={4}
        maxLength={2000}
        disabled={uploading}
      />

      {pending.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pending.map((p) => (
            <div
              key={p.id}
              className="relative w-24 h-24 rounded-cozy overflow-hidden border border-wood-200 bg-cream-100"
            >
              {p.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={p.url} className="w-full h-full object-cover" muted />
              )}
              <button
                type="button"
                onClick={() => removePending(p.id)}
                disabled={uploading}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-wood-900/70 text-white hover:bg-wood-900"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <ImagePlus className="w-4 h-4" strokeWidth={2} />
          Add photos / videos
        </Button>

        <label className="inline-flex items-center gap-2 text-sm text-wood-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={uploading}
            className="w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
          />
          Share on my StarHub
        </label>

        <div className="flex-1" />

        <Button onClick={submit} disabled={uploading} size="lg">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              Posting…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" strokeWidth={2} />
              Post
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-cozy bg-terracotta-50 border border-terracotta-200 px-3 py-2 text-sm text-terracotta-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </Card>
  );
}
