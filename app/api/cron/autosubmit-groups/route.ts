import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { groupHasSubmitted, writeGroupSubmission } from "@/lib/groups-server";

/**
 * Daily safety sweep: auto-submit collaborative groups whose assignment is
 * past due and that haven't submitted yet. On-access auto-submit
 * (maybeAutoSubmitGroup) usually catches these first; this is the backstop.
 *
 * Protected by CRON_SECRET — Vercel Cron sends `Authorization: Bearer <secret>`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: assignments } = await admin
    .from("assignments")
    .select("id")
    .eq("collaborative", true)
    .not("due_date", "is", null)
    .lt("due_date", nowIso);

  let submitted = 0;
  for (const a of assignments ?? []) {
    const { data: groups } = await admin
      .from("assignment_groups")
      .select("id")
      .eq("assignment_id", a.id);
    for (const g of groups ?? []) {
      if (await groupHasSubmitted(g.id)) continue;
      const r = await writeGroupSubmission(g.id);
      if (r.ok && r.count > 0) submitted += 1;
    }
  }

  return NextResponse.json({ ok: true, groupsSubmitted: submitted });
}
