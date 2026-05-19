import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSubmissionMedia } from "@/lib/assignments";

/**
 * Proxy route for media in the private `submissions` storage bucket.
 *
 * Path mapping:
 *   /api/files/submissions/<submissionId>/<fileId>.<ext>
 *     -> storage path "<submissionId>/<fileId>.<ext>"
 *
 * Auth: the requester must be the submission's owner, OR a teacher.
 * Content-Type is read from the submission's uploaded_files JSON so we
 * serve the bytes with the same mime they were stored with.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length < 2) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const submissionId = path[0];
  const storagePath = path.join("/");

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select("user_id, uploaded_files")
    .eq("id", submissionId)
    .single();
  if (!sub) return new NextResponse("Not found", { status: 404 });

  if (user.role !== "teacher" && sub.user_id !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const fileName = path[path.length - 1];
  const fileId = fileName.replace(/\.[^.]+$/, "");
  const media = parseSubmissionMedia(sub.uploaded_files).find(
    (m) => m.id === fileId
  );
  const contentType = media?.mime ?? "application/octet-stream";

  const { data, error } = await admin.storage
    .from("submissions")
    .download(storagePath);
  if (error || !data) {
    return new NextResponse("File not found", { status: 404 });
  }

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
