"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  ImagePlus,
  Video,
  StopCircle,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { createPost } from "@/app/discussions/actions";

interface DiscussionComposerProps {
  boardId: string;
  parentId?: string | null;
  placeholder?: string;
  submitLabel?: string;
}

type Pending = {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
};

export function DiscussionComposer({
  boardId,
  parentId = null,
  placeholder = "Write a post…",
  submitLabel = "Post",
}: DiscussionComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPosting, startPost] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    setPending((p) => [...p, ...next]);
  }

  function removePending(id: string) {
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return p.filter((x) => x.id !== id);
    });
  }

  function clearStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      });
      const mimes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = mimes.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        clearStream();
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        if (blob.size > 0) {
          addFiles([
            new File([blob], "screen-recording.webm", { type: blob.type }),
          ]);
        }
      };
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      clearStream();
      if (err instanceof Error && err.name === "NotAllowedError") return;
      setError(err instanceof Error ? err.message : "Recording failed");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function submit() {
    if (!body.trim() && pending.length === 0) {
      setError("Write something or attach a file.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("board_id", boardId);
    if (parentId) fd.set("parent_id", parentId);
    fd.set("body", body.trim());
    for (const p of pending) fd.append("files", p.file);
    startPost(async () => {
      const r = await createPost(fd);
      if (r.ok) {
        setBody("");
        pending.forEach((p) => URL.revokeObjectURL(p.url));
        setPending([]);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={isPosting}
      />

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((p) => (
            <div
              key={p.id}
              className="relative w-20 h-20 rounded-cozy overflow-hidden border border-wood-200 bg-cream-100"
            >
              {p.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video
                  src={p.url}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-wood-900/70 text-white"
                aria-label="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-terracotta-700">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={isPosting || isRecording}
        >
          <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} />
          Attach
        </Button>
        {isRecording ? (
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={stopRecording}
          >
            <StopCircle className="w-3.5 h-3.5" strokeWidth={2} />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={startRecording}
            disabled={isPosting}
          >
            <Video className="w-3.5 h-3.5" strokeWidth={2} />
            Record screen
          </Button>
        )}
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={isPosting || isRecording}
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2} />
          {isPosting ? "Posting…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
