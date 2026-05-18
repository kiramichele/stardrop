import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseRosterCsv, importRoster } from "@/lib/csv";

export async function POST(request: NextRequest) {
  // Verify the caller is a teacher
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

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("csv") as File | null;
  const term = formData.get("term")?.toString() ?? "2026-27 Fall";
  const classId = formData.get("class_id")?.toString() || undefined;

  if (!file) {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const csvText = await file.text();
  const { rows, errors: parseErrors } = parseRosterCsv(csvText);

  if (rows.length === 0 && parseErrors.length > 0) {
    return NextResponse.json(
      {
        error: "CSV had no valid rows",
        parse_errors: parseErrors,
      },
      { status: 400 }
    );
  }

  const result = await importRoster(rows, { term, class_id: classId });

  // Merge parse errors into the result
  result.errors = [...parseErrors, ...result.errors];

  return NextResponse.json(result);
}