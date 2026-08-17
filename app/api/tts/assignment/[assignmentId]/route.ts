import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { htmlToText } from "@/lib/html-text";
import { getCachedOrSynthesize, isTtsConfigured } from "@/lib/tts";

/**
 * Whole-assignment read-aloud, mirroring /api/tts/lesson/:id. Streams mp3
 * for the full text of an assignment's uploaded HTML prompt (interactive
 * instructions, dev log / video response / code prompt, peer review
 * directions — whatever the teacher uploaded as interactive_html_url).
 * Audio is cached by content hash inside getCachedOrSynthesize.
 *
 * requireStudent() plus the RLS-scoped assignment lookup below reproduce
 * the same access boundary getAssignmentForStudent() enforces on the page
 * itself — published, and only for students in a class it's assigned to.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  if (!isTtsConfigured()) {
    return new NextResponse("Read-aloud is not configured", { status: 503 });
  }

  await requireStudent();
  const { assignmentId } = await params;

  // RLS-scoped client (not admin) — matches the visibility boundary the
  // assignment page itself uses, not just "is it published somewhere".
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, interactive_html_url")
    .eq("id", assignmentId)
    .eq("published", true)
    .maybeSingle();

  if (!assignment || !assignment.interactive_html_url) {
    return new NextResponse("Assignment not found", { status: 404 });
  }

  // Pull the HTML straight from storage (path convention:
  // assignments/{id}.html, same "lessons" bucket lessons use) and extract
  // readable text server-side.
  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from("lessons")
    .download(`assignments/${assignmentId}.html`);
  if (error || !file) {
    return new NextResponse("Assignment content unavailable", {
      status: 404,
    });
  }

  const text = htmlToText(await file.text());
  if (!text) {
    return new NextResponse("Nothing to read in this assignment", {
      status: 422,
    });
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
