import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { htmlToText } from "@/lib/html-text";
import { getCachedOrSynthesize, isTtsConfigured } from "@/lib/tts";

/**
 * Whole-lesson read-aloud. Streams mp3 for the full text of a published
 * lesson. Audio is cached by content hash inside getCachedOrSynthesize, so
 * repeat plays (this student or another) don't re-bill ElevenLabs.
 *
 * requireStudent() gates access; the <audio> element points its src here.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  if (!isTtsConfigured()) {
    return new NextResponse("Read-aloud is not configured", { status: 503 });
  }

  await requireStudent();
  const { lessonId } = await params;

  // Confirm the lesson exists and is published (students only).
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, html_url")
    .eq("id", lessonId)
    .eq("published", true)
    .maybeSingle();

  if (!lesson || !lesson.html_url) {
    return new NextResponse("Lesson not found", { status: 404 });
  }

  // Pull the lesson HTML straight from storage (path convention: {id}.html)
  // and extract readable text server-side.
  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from("lessons")
    .download(`${lessonId}.html`);
  if (error || !file) {
    return new NextResponse("Lesson content unavailable", { status: 404 });
  }

  const text = htmlToText(await file.text());
  if (!text) {
    return new NextResponse("Nothing to read in this lesson", { status: 422 });
  }

  try {
    const audio = await getCachedOrSynthesize(text);
    return new NextResponse(Buffer.from(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        // Same content hash -> same bytes; safe to cache in the browser.
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
