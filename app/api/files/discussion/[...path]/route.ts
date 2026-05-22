import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Proxy for the private `discussion` storage bucket.
 *
 * Path: /api/files/discussion/<boardId>/<fileId>.<ext>
 *
 * Auth: a teacher may view anything; a student must be enrolled in the
 * board's class.
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

  const boardId = path[0];
  const storagePath = path.join("/");
  const admin = createAdminClient();

  if (user.role !== "teacher") {
    const { data: board } = await admin
      .from("discussion_boards")
      .select("class_id")
      .eq("id", boardId)
      .maybeSingle();
    if (!board) return new NextResponse("Not found", { status: 404 });
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("class_id", board.class_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!enrollment) return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await admin.storage
    .from("discussion")
    .download(storagePath);
  if (error || !data) {
    return new NextResponse("File not found", { status: 404 });
  }

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
