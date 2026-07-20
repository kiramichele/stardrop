import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth";
import {
  getCachedOrSynthesize,
  isTtsConfigured,
  TTS_MAX_CHARS,
} from "@/lib/tts";

/**
 * Read-a-selection. POST { text } and get back mp3 for just that passage.
 * Cached by content hash like the whole-lesson route. The client fetches
 * this, turns the response into an object URL, and plays it.
 */
export async function POST(request: NextRequest) {
  if (!isTtsConfigured()) {
    return new NextResponse("Read-aloud is not configured", { status: 503 });
  }

  await requireStudent();

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    return new NextResponse("Invalid request body", { status: 400 });
  }

  if (!text) {
    return new NextResponse("No text provided", { status: 400 });
  }
  if (text.length > TTS_MAX_CHARS) {
    text = text.slice(0, TTS_MAX_CHARS);
  }

  try {
    const audio = await getCachedOrSynthesize(text);
    return new NextResponse(Buffer.from(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : "Read-aloud failed",
      { status: 502 }
    );
  }
}
