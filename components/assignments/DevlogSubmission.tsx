"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import {
  Video,
  Upload,
  StopCircle,
  Send,
  Check,
  AlertCircle,
  Lock,
  RotateCcw,
  Trash2,
  Loader2,
  Camera,
  CameraOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  parseSubmissionMedia,
  submissionMediaUrl,
  type SubmissionMedia,
} from "@/lib/assignments";
import {
  prepareDevlogSubmission,
  finalizeDevlogSubmission,
} from "@/app/student/assignments/actions";
import { setDevlogPublic } from "@/app/devlogs/actions";

interface DevlogSubmissionProps {
  assignmentId: string;
  initialMedia: SubmissionMedia[];
  initialStatus: "draft" | "submitted" | "graded";
  initialSubmissionId: string | null;
  initialIsPublic: boolean;
}

type Mode = "record" | "upload";

const DEVLOGS_BUCKET = "devlogs";
const PIP_WIDTH_RATIO = 0.22; // camera takes ~22% of the canvas width

export function DevlogSubmission({
  assignmentId,
  initialMedia,
  initialStatus,
  initialSubmissionId,
  initialIsPublic,
}: DevlogSubmissionProps) {
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<string | null>(
    initialSubmissionId
  );
  const [submittedMedia, setSubmittedMedia] = useState<SubmissionMedia | null>(
    initialMedia[0] ?? null
  );
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  // Visibility chosen in the preview/upload form, applied at submit.
  const [pendingIsPublic, setPendingIsPublic] = useState(initialIsPublic);

  const [mode, setMode] = useState<Mode>("record");
  const [includePip, setIncludePip] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("video/webm");
  const [previewSize, setPreviewSize] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isLocked = status === "graded";

  // Stream + recorder refs (so cleanup can find them).
  const screenStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);

  function stopAllStreams() {
    [screenStreamRef, camStreamRef, micStreamRef].forEach((ref) => {
      ref.current?.getTracks().forEach((t) => t.stop());
      ref.current = null;
    });
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
    setPreviewMime("video/webm");
    setPreviewSize(0);
  }

  // Cleanup on unmount.
  useEffect(
    () => () => {
      stopAllStreams();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    // we intentionally only want this on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function setBlobAsPreview(blob: Blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(blob);
    setPreviewBlob(blob);
    setPreviewUrl(url);
    setPreviewMime(blob.type || "video/webm");
    setPreviewSize(blob.size);
    setError(null);
  }

  async function startRecording() {
    if (isLocked || isUploading || isRecording) return;
    setError(null);
    clearPreview();

    try {
      // 1. Screen (with optional system audio if user shares a tab).
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screen;
      screen.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") stopRecording();
      });

      // 2. Microphone (always — it's a dev log, they're talking).
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;

      // 3. Camera (optional, for PIP overlay).
      let cam: MediaStream | null = null;
      if (includePip) {
        try {
          cam = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          camStreamRef.current = cam;
        } catch (camErr) {
          // Camera failed — keep going without PIP.
          console.warn("Camera unavailable, recording without PIP", camErr);
          cam = null;
        }
      }

      // Build the final video stream: either the raw screen, or a
      // canvas that draws screen + camera-in-the-corner each frame.
      const videoStream = cam
        ? await buildPipStream(screen, cam)
        : screen;

      // Mix audio: mic + any system audio from the screen share.
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      const displayAudio = screen.getAudioTracks();
      if (displayAudio.length > 0) {
        audioCtx
          .createMediaStreamSource(new MediaStream(displayAudio))
          .connect(dest);
      }
      const micAudio = mic.getAudioTracks();
      if (micAudio.length > 0) {
        audioCtx
          .createMediaStreamSource(new MediaStream(micAudio))
          .connect(dest);
      }

      const combined = new MediaStream();
      videoStream.getVideoTracks().forEach((t) => combined.addTrack(t));
      dest.stream.getAudioTracks().forEach((t) => combined.addTrack(t));

      const tryMimes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = tryMimes.find((m) =>
        MediaRecorder.isTypeSupported(m)
      );

      const recorder = new MediaRecorder(
        combined,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        stopAllStreams();
        setIsRecording(false);
        setRecordingMs(0);
        if (blob.size > 0) setBlobAsPreview(blob);
      };

      recorder.start(1000);
      setIsRecording(true);
      recordStartRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - recordStartRef.current);
      }, 250);
    } catch (err) {
      stopAllStreams();
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permission denied. Allow screen + mic access to record.");
      } else {
        setError(err instanceof Error ? err.message : "Recording failed.");
      }
    }
  }

  /**
   * Set up a canvas that draws the screen video full-frame and the
   * camera video as a small overlay in the bottom-right. Returns a
   * MediaStream sourced from the canvas via captureStream().
   */
  async function buildPipStream(
    screen: MediaStream,
    cam: MediaStream
  ): Promise<MediaStream> {
    const screenVideo = screenVideoRef.current ?? document.createElement("video");
    screenVideo.srcObject = screen;
    screenVideo.muted = true;
    await screenVideo.play();

    const camVideo = camVideoRef.current ?? document.createElement("video");
    camVideo.srcObject = cam;
    camVideo.muted = true;
    await camVideo.play();

    // Wait one frame so videoWidth/Height are populated.
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = screenVideo.videoWidth || 1280;
    canvas.height = screenVideo.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");

    const draw = () => {
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      // Camera overlay, bottom-right with a 16px-ish margin (scaled).
      const margin = Math.round(canvas.width * 0.015);
      const camW = Math.round(canvas.width * PIP_WIDTH_RATIO);
      const aspect =
        camVideo.videoWidth && camVideo.videoHeight
          ? camVideo.videoHeight / camVideo.videoWidth
          : 0.75;
      const camH = Math.round(camW * aspect);
      const x = canvas.width - camW - margin;
      const y = canvas.height - camH - margin;
      // Soft border around the PIP so it pops against busy screens.
      ctx.fillStyle = "#fefcf8";
      ctx.fillRect(x - 4, y - 4, camW + 8, camH + 8);
      ctx.drawImage(camVideo, x, y, camW, camH);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return canvas.captureStream(30);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function discard() {
    if (isUploading) return;
    clearPreview();
    setError(null);
  }

  function togglePublicOnSubmitted() {
    if (!submissionId || isUploading) return;
    const next = !isPublic;
    setIsPublic(next); // optimistic
    setPendingIsPublic(next);
    startTransition(async () => {
      const result = await setDevlogPublic(submissionId, next);
      if (!result.ok) {
        setIsPublic(!next);
        setPendingIsPublic(!next);
        setError(result.error ?? "Couldn't update visibility.");
      } else {
        setError(null);
      }
    });
  }

  function onFilePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("That doesn't look like a video file.");
      e.target.value = "";
      return;
    }
    setBlobAsPreview(file);
    e.target.value = "";
  }

  async function submit() {
    if (!previewBlob || isUploading || isLocked) return;
    setError(null);
    setIsUploading(true);
    try {
      const prep = await prepareDevlogSubmission(assignmentId);
      if (!prep.ok) {
        setError(prep.error);
        setIsUploading(false);
        return;
      }
      const sid = prep.submissionId;
      setSubmissionId(sid);

      const fileId = crypto.randomUUID();
      const ext = extFromMime(previewMime);
      const storagePath = `${prep.userId}/${sid}/${fileId}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(DEVLOGS_BUCKET)
        .upload(storagePath, previewBlob, {
          contentType: previewMime,
          upsert: true,
        });
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }

      const result = await finalizeDevlogSubmission(sid, {
        fileId,
        storagePath,
        mime: previewMime,
        size: previewSize,
      });
      if (!result.ok) {
        setError(result.error ?? "Couldn't save the submission.");
        setIsUploading(false);
        return;
      }

      // If they asked to share with the class, flip visibility too —
      // best-effort: a failure here surfaces but the submission still saved.
      if (pendingIsPublic !== isPublic) {
        const vis = await setDevlogPublic(sid, pendingIsPublic);
        if (vis.ok) setIsPublic(pendingIsPublic);
      }

      // Success — flip into submitted state and surface the new video.
      const newMedia: SubmissionMedia = {
        id: fileId,
        kind: "video",
        storagePath,
        mime: previewMime,
        size: previewSize,
        createdAt: new Date().toISOString(),
        bucket: "devlogs",
      };
      setSubmittedMedia(newMedia);
      setStatus("submitted");
      clearPreview();
      startTransition(() => {
        // Refresh server data — no-op if the caller doesn't need it.
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
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
                Your devlog has been graded. Ask Ms. Shinn if you need to
                revise.
              </p>
            </div>
          </div>
        </Card>
      )}

      {submittedMedia && status !== "draft" && (
        <Card padded={false} className="overflow-hidden">
          <div className="px-4 py-3 border-b border-wood-100 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow">
                {status === "graded" ? "Submitted devlog" : "Your latest submission"}
              </p>
              <p className="text-xs text-wood-500 mt-0.5">
                {(submittedMedia.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                {new Date(submittedMedia.createdAt).toLocaleString()}
              </p>
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={togglePublicOnSubmitted}
                className={[
                  "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isPublic
                    ? "bg-sage-100 text-sage-800 border-sage-200 hover:bg-sage-200"
                    : "bg-cream-100 text-wood-600 border-wood-200 hover:bg-cream-200",
                ].join(" ")}
                aria-pressed={isPublic}
                title={
                  isPublic
                    ? "Shared on the Devlogs wall — click to make private"
                    : "Private — click to share on the Devlogs wall"
                }
              >
                {isPublic ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Shared with class
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Private
                  </>
                )}
              </button>
            )}
          </div>
          <video
            src={submissionMediaUrl(submittedMedia)}
            controls
            className="w-full max-h-[480px] bg-black"
          />
        </Card>
      )}

      {!isLocked && (
        <Card>
          {/* Mode tabs */}
          <div className="mb-4 inline-flex rounded-cozy border border-wood-200 p-0.5">
            <ModeTab
              active={mode === "record"}
              onClick={() => {
                if (!isRecording) setMode("record");
              }}
              disabled={isRecording}
              icon={<Video className="w-3.5 h-3.5" />}
              label="Record"
            />
            <ModeTab
              active={mode === "upload"}
              onClick={() => {
                if (!isRecording) setMode("upload");
              }}
              disabled={isRecording}
              icon={<Upload className="w-3.5 h-3.5" />}
              label="Upload video"
            />
          </div>

          {mode === "record" ? (
            <div className="space-y-3">
              {!isRecording && !previewBlob && (
                <>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePip}
                      onChange={(e) => setIncludePip(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                    />
                    <span>
                      <span className="block text-sm font-medium text-wood-900 inline-flex items-center gap-1.5">
                        {includePip ? (
                          <Camera className="w-3.5 h-3.5 text-terracotta-600" />
                        ) : (
                          <CameraOff className="w-3.5 h-3.5 text-wood-400" />
                        )}
                        Camera overlay (PIP)
                      </span>
                      <span className="block text-xs text-wood-500">
                        Adds a small camera box in the bottom-right corner of
                        the recording.
                      </span>
                    </span>
                  </label>
                  <p className="text-xs text-wood-500">
                    Your browser will ask which screen/window/tab to share,
                    then for microphone access
                    {includePip ? ", then camera access" : ""}.
                  </p>
                  <Button onClick={startRecording}>
                    <Video className="w-4 h-4" strokeWidth={2} />
                    Start recording
                  </Button>
                </>
              )}

              {isRecording && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-sm text-terracotta-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-terracotta-600 animate-pulse" />
                      Recording {formatTime(recordingMs)}
                    </span>
                    <Button variant="danger" onClick={stopRecording}>
                      <StopCircle className="w-4 h-4" strokeWidth={2} />
                      Stop
                    </Button>
                  </div>
                  {includePip && (
                    <div className="rounded-cozy bg-cream-100 border border-wood-200 p-2">
                      <p className="text-xs text-wood-500 mb-1">
                        Live preview
                      </p>
                      <canvas
                        ref={canvasRef}
                        className="w-full rounded bg-black"
                      />
                    </div>
                  )}
                  {/* Hidden video elements feed the canvas. */}
                  <video
                    ref={screenVideoRef}
                    className="hidden"
                    muted
                    playsInline
                  />
                  <video
                    ref={camVideoRef}
                    className="hidden"
                    muted
                    playsInline
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {!previewBlob && (
                <>
                  <label className="flex items-center gap-3 rounded-cozy border border-dashed border-wood-300 bg-cream-50 px-4 py-3 cursor-pointer hover:border-terracotta-400 hover:bg-cream-100 transition-colors">
                    <Upload
                      className="w-5 h-5 text-terracotta-600 flex-shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="text-sm text-wood-700">
                      Choose a video file…
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={onFilePicked}
                    />
                  </label>
                  <p className="text-xs text-wood-500">
                    Most formats work — mp4, webm, mov. Up to 500 MB.
                  </p>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {previewBlob && previewUrl && !isLocked && (
        <Card>
          <p className="label-eyebrow mb-2">Preview</p>
          <video
            src={previewUrl}
            controls
            className="w-full rounded-cozy bg-black max-h-[480px]"
          />
          <p className="text-xs text-wood-500 mt-2">
            {(previewSize / 1024 / 1024).toFixed(1)} MB · {previewMime}
          </p>

          <label className="mt-4 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pendingIsPublic}
              onChange={(e) => setPendingIsPublic(e.target.checked)}
              disabled={isUploading}
              className="w-4 h-4 mt-0.5 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
            />
            <span>
              <span className="block text-sm font-medium text-wood-900">
                Share with the class on the Devlogs wall
              </span>
              <span className="block text-xs text-wood-500">
                Classmates can watch, like, and leave comments. You can
                change this any time.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Button onClick={submit} disabled={isUploading} size="lg">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  Uploading…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={2} />
                  {submittedMedia ? "Replace submission" : "Submit devlog"}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={discard}
              disabled={isUploading}
            >
              {mode === "record" ? (
                <>
                  <RotateCcw className="w-4 h-4" strokeWidth={2} />
                  Re-record
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                  Discard
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-cozy bg-terracotta-50 border border-terracotta-200 text-sm text-terracotta-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {status === "submitted" && !previewBlob && !isUploading && (
        <p className="flex items-center gap-1.5 text-sm text-sage-700">
          <Check className="w-3.5 h-3.5" />
          Submitted. You can replace it any time until it&apos;s graded.
        </p>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  disabled,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-1.5 rounded-[0.4rem] px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
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

function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogv";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  return "webm";
}

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

// Defensive parse for callers that pass raw uploaded_files — kept here
// just so this module is the one stop for devlog rendering.
export function pickDevlogMedia(uploadedFiles: unknown): SubmissionMedia | null {
  const list = parseSubmissionMedia(uploadedFiles);
  return list.find((m) => m.bucket === "devlogs" && m.kind === "video") ?? list[0] ?? null;
}
