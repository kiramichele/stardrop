import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * ElevenLabs wrappers for the accessibility features:
 *   - Text-to-speech (read-aloud), cached to Supabase Storage by content
 *     hash so we only pay ElevenLabs once per unique passage.
 *   - Speech-to-text (Scribe) for the dictation mic button.
 *
 * Both no-op cleanly when ELEVENLABS_API_KEY is unset, so the UI can hide
 * the controls and every primary flow (lessons, notes, submissions) keeps
 * working without the integration configured.
 *
 * Required env:
 *   - ELEVENLABS_API_KEY
 * Optional env:
 *   - ELEVENLABS_VOICE_ID   (default: Rachel — a clear, neutral voice)
 *   - ELEVENLABS_TTS_MODEL  (default: eleven_turbo_v2_5 — fast + low cost)
 *   - ELEVENLABS_STT_MODEL  (default: scribe_v1)
 */

const API_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const DEFAULT_TTS_MODEL = "eleven_turbo_v2_5";
const DEFAULT_STT_MODEL = "scribe_v1";
const TTS_BUCKET = "tts-audio";

// ElevenLabs accepts large inputs, but we keep a sane ceiling per request
// and chunk longer text (see synthesizeLong). ~2.5k chars ≈ a few minutes.
export const TTS_CHUNK_CHAR_LIMIT = 2500;
// Hard cap for a single "read this selection" request.
export const TTS_MAX_CHARS = 20000;

export function isTtsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

// STT shares the same API key.
export const isSttConfigured = isTtsConfigured;

function voiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Synthesize a single chunk of text to mp3 bytes. Throws on API error.
 * Caller is responsible for chunking within TTS_CHUNK_CHAR_LIMIT.
 */
async function synthesizeChunk(text: string): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const model = process.env.ELEVENLABS_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;

  const res = await fetch(
    `${API_BASE}/text-to-speech/${voiceId()}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Split text into chunks at paragraph / sentence boundaries so each stays
 * under the per-request character limit. Never splits mid-word.
 */
function chunkText(text: string, limit = TTS_CHUNK_CHAR_LIMIT): string[] {
  const clean = text.trim();
  if (clean.length <= limit) return clean ? [clean] : [];

  // Prefer paragraph breaks, then sentence ends, then hard wrap.
  const pieces = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  const push = (s: string) => {
    if (s) chunks.push(s);
  };

  for (const piece of pieces) {
    if (piece.length > limit) {
      // Break a long paragraph on sentence boundaries.
      const sentences = piece.match(/[^.!?]+[.!?]*\s*/g) ?? [piece];
      for (const sentence of sentences) {
        let s = sentence;
        while (s.length > limit) {
          push(current);
          current = "";
          push(s.slice(0, limit));
          s = s.slice(limit);
        }
        if (current.length + s.length > limit) {
          push(current);
          current = s;
        } else {
          current += s;
        }
      }
    } else if (current.length + piece.length + 2 > limit) {
      push(current);
      current = piece;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  push(current);
  return chunks;
}

/**
 * Synthesize arbitrary-length text to a single mp3, chunking as needed and
 * concatenating the resulting mp3 segments. mp3 frames are self-describing,
 * so naive concatenation plays back as one continuous clip in browsers.
 */
async function synthesizeLong(text: string): Promise<Uint8Array> {
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error("No text to synthesize");
  if (chunks.length === 1) return synthesizeChunk(chunks[0]);

  const parts: Uint8Array[] = [];
  // Sequential on purpose — keeps us well under ElevenLabs rate limits and
  // preserves order for concatenation.
  for (const chunk of chunks) {
    parts.push(await synthesizeChunk(chunk));
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

/**
 * Return mp3 bytes for `text`, using the Supabase Storage cache keyed by the
 * text's SHA-256. Generates (and bills) only on a cache miss.
 */
export async function getCachedOrSynthesize(
  text: string
): Promise<Uint8Array> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("No text to synthesize");

  const admin = createAdminClient();
  const key = `tts/${sha256(trimmed)}.mp3`;

  // Cache hit?
  const { data: cached } = await admin.storage
    .from(TTS_BUCKET)
    .download(key);
  if (cached) {
    return new Uint8Array(await cached.arrayBuffer());
  }

  // Miss — synthesize, then store best-effort (a failed upload just means
  // we re-synthesize next time; it must not break playback).
  const audio = await synthesizeLong(trimmed);
  try {
    await admin.storage.from(TTS_BUCKET).upload(
      key,
      // Buffer view over the bytes; contentType so the object serves as mp3.
      Buffer.from(audio),
      { contentType: "audio/mpeg", upsert: true, cacheControl: "31536000" }
    );
  } catch {
    // ignore — cache is an optimization, not a requirement
  }
  return audio;
}

/**
 * Transcribe recorded audio to text via ElevenLabs Scribe. `audio` is the
 * raw uploaded blob (e.g. audio/webm from MediaRecorder). Throws on error.
 */
export async function transcribe(audio: Blob): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const model = process.env.ELEVENLABS_STT_MODEL?.trim() || DEFAULT_STT_MODEL;

  const form = new FormData();
  form.append("file", audio, "recording.webm");
  form.append("model_id", model);

  const res = await fetch(`${API_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs STT failed (${res.status}): ${detail.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
