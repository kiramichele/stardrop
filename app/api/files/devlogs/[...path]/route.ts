import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth-gated read proxy for the private `devlogs` storage bucket.
 *
 * Path mapping:
 *   /api/files/devlogs/<userId>/<submissionId>/<fileId>.<ext>
 *     -> storage path "<userId>/<submissionId>/<fileId>.<ext>"
 *
 * Auth: requester must be the submission owner, OR a teacher.
 *
 * Rather than streaming the bytes through this function (devlog videos
 * can easily exceed 100 MB and a serverless function is the wrong tool
 * for that), we issue a short-lived Supabase signed URL and redirect.
 * The browser then fetches directly from storage with proper Range
 * support, which is what video players need to seek.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length < 3) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const submissionId = path[1];
  const storagePath = path.join("/");

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select("user_id")
    .eq("id", submissionId)
    .single();
  if (!sub) return new NextResponse("Not found", { status: 404 });

  if (user.role !== "teacher" && sub.user_id !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: signed, error } = await admin.storage
    .from("devlogs")
    .createSignedUrl(storagePath, 60 * 5);
  if (error || !signed?.signedUrl) {
    return new NextResponse("File not found", { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
