import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMergedGradebook } from "@/lib/gradebook-server";

// GET /api/teacher/gradebook/export
// Re-emits the stored Canvas template with app grades merged in, as a
// CSV download. Teacher-only.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await buildMergedGradebook();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
