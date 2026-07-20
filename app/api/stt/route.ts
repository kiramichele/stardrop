import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { transcribe, isSttConfigured } from "@/lib/tts";

// Guard against oversized uploads (roughly a few minutes of speech).
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Dictation endpoint. Accepts a recorded audio blob (multipart form field
 * "audio") and returns { text } transcribed by ElevenLabs Scribe. Available
 * to any signed-in user — the mic button appears on student surfaces
 * (submissions, notes, discussions, comments).
 */
export async function POST(request: NextRequest) {
  if (!isSttConfigured()) {
    return NextResponse.json(
      { error: "Dictation is not configured" },
      { status: 503 }
    );
  }

  await requireUser();

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("audio");
    if (value instanceof File) audio = value;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Recording is too long" },
      { status: 413 }
    );
  }

  try {
    const text = await transcribe(audio);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 502 }
    );
  }
}
