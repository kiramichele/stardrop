"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Camera,
  Video,
  StopCircle,
  Send,
  Save,
  Check,
  AlertCircle,
  Trash2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  uploadSubmissionMedia,
  removeSubmissionMedia,
  submitAssignment,
} from "@/app/student/assignments/actions";
import type { SubmissionMedia } from "@/lib/assignments";

interface UnityUploadAssignmentProps {
  assignmentId: string;
  initialMedia: SubmissionMedia[];
  initialStatus: "draft" | "submitted" | "graded";
  initialSubmissionId: string | null;
}

export function UnityUploadAssignment({
  assignmentId,
  initialMedia,
  initialStatus,
  initialSubmissionId,
}: UnityUploadAssignmentProps) {
  const [media, setMedia] = useState<SubmissionMedia[]>(initialMedia);
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<string | null>(
    initialSubmissionId
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const isLocked = status === "graded";
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => () => clearStream(), []);

  async function uploadBlob(blob: Blob, kind: "image" | "video") {
    const form = new FormData();
    form.set("kind", kind);
    form.set(
      "file",
      new File([blob], `capture.${kind === "image" ? "png" : "webm"}`, {
        type: blob.type,
      })
    );
    startUpload(async () => {
      try {
        const result = await uploadSubmissionMedia(assignmentId, form);
        if (result.ok) {
          setMedia((m) => [...m, result.media]);
          if (!submissionId) setSubmissionId(result.submissionId);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  async function takeScreenshot() {
    if (isLocked || isUploading) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;

      // Capture a single frame from the live stream
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      // Allow one frame to actually render before snapshotting
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Couldn't create canvas context");
      ctx.drawImage(video, 0, 0);

      clearStream();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Couldn't encode screenshot");

      await uploadBlob(blob, "image");
    } catch (err) {
      clearStream();
      if (err instanceof Error && err.name === "NotAllowedError") return;
      setError(err instanceof Error ? err.message : "Screenshot failed");
    }
  }

  async function startRecording() {
    if (isLocked || isUploading) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      // If the user clicks the browser's "Stop sharing" UI, end recording cleanly
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") stopRecording();
      });

      const tryMimes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = tryMimes.find((m) => MediaRecorder.isTypeSupported(m));

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        clearStream();
        if (tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
        setIsRecording(false);
        setRecordingMs(0);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        if (blob.size > 0) await uploadBlob(blob, "video");
      };

      recorder.start(1000);
      setIsRecording(true);
      recordStartRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - recordStartRef.current);
      }, 250);
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

  function handleRemove(mediaId: string) {
    if (!submissionId) return;
    if (!confirm("Remove this file?")) return;
    startUpload(async () => {
      const result = await removeSubmissionMedia(submissionId, mediaId);
      if (result.ok) {
        setMedia((m) => m.filter((x) => x.id !== mediaId));
        setError(null);
      } else {
        setError(result.error ?? "Couldn't remove file");
      }
    });
  }

  function handleSubmit() {
    if (isLocked) return;
    if (!submissionId || media.length === 0) {
      setError("Capture at least one file before submitting.");
      return;
    }
    startSubmit(async () => {
      const result = await submitAssignment(submissionId, {});
      if (result.ok) {
        setStatus("submitted");
        setError(null);
      } else {
        setError(result.error ?? "Submit failed");
      }
    });
  }

  function formatTime(ms: number) {
    const total = Math.floor(ms / 1000);
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-4">
      {isLocked && (
        <Card className="bg-sage-50 border-sage-200">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-sage-700" strokeWidth={1.75} />
            <div>
              <p className="font-display text-base text-sage-900">
                Graded — submission locked
              </p>
              <p className="text-sm text-sage-700">
                Your work has been graded. Ask Ms. Shinn if you need to revise.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg text-wood-900">
            Capture your screen
          </h3>
          {isRecording && (
            <span className="flex items-center gap-1.5 text-sm text-terracotta-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-terracotta-600 animate-pulse" />
              Recording {formatTime(recordingMs)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isRecording ? (
            <Button onClick={stopRecording} variant="danger">
              <StopCircle className="w-4 h-4" strokeWidth={2} />
              Stop recording
            </Button>
          ) : (
            <>
              <Button
                onClick={takeScreenshot}
                disabled={isLocked || isUploading}
              >
                <Camera className="w-4 h-4" strokeWidth={2} />
                Take screenshot
              </Button>
              <Button
                onClick={startRecording}
                disabled={isLocked || isUploading}
                variant="ghost"
              >
                <Video className="w-4 h-4" strokeWidth={2} />
                Record video
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-wood-500 mt-3">
          Your browser will ask which screen, window, or tab to share.
          {isRecording &&
            " You can also stop the recording from the browser's sharing bar."}
        </p>
      </Card>

      {media.length > 0 && (
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-wood-100">
            <h3 className="font-display text-lg text-wood-900">
              Your captures ({media.length})
            </h3>
          </div>
          <ul className="divide-y divide-wood-100">
            {media.map((m) => (
              <MediaPreview
                key={m.id}
                media={m}
                submissionId={submissionId}
                locked={isLocked}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-cozy bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {isUploading && (
          <span className="flex items-center gap-1.5 text-sm text-wood-500">
            <Save className="w-3.5 h-3.5 animate-pulse" />
            Uploading…
          </span>
        )}
        {status === "submitted" && !isUploading && !isSubmitting && (
          <span className="flex items-center gap-1.5 text-sm text-sage-700">
            <Check className="w-3.5 h-3.5" />
            Submitted
          </span>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isLocked || isSubmitting || media.length === 0}
          size="lg"
        >
          <Send className="w-4 h-4" strokeWidth={2} />
          {isSubmitting
            ? "Submitting…"
            : status === "submitted"
              ? "Re-submit"
              : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function MediaPreview({
  media,
  submissionId,
  locked,
  onRemove,
}: {
  media: SubmissionMedia;
  submissionId: string | null;
  locked: boolean;
  onRemove: (id: string) => void;
}) {
  const url = `/api/files/submissions/${media.storagePath}`;
  return (
    <li className="p-4 flex items-start gap-4">
      <div className="w-32 h-20 rounded-cozy bg-cream-100 overflow-hidden flex items-center justify-center flex-shrink-0">
        {media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <video
            src={url}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-wood-900 capitalize">
          {media.kind} · {(media.size / 1024 / 1024).toFixed(2)} MB
        </p>
        <p className="text-xs text-wood-500 mt-0.5">
          {new Date(media.createdAt).toLocaleString()}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-terracotta-700 hover:text-terracotta-800"
        >
          <ExternalLink className="w-3 h-3" />
          Open in new tab
        </a>
      </div>
      {!locked && submissionId && (
        <button
          onClick={() => onRemove(media.id)}
          className="p-2 rounded-cozy text-wood-400 hover:text-terracotta-700 hover:bg-terracotta-50 transition-colors"
          aria-label="Remove"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      )}
    </li>
  );
}
