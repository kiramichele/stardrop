import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

// Manual parent/guardian digest emails — a teacher writes one, picks which
// classes it goes to (or everyone), and sends it. No scheduling; the log
// just remembers what already went out.

export type DigestClassOption = { id: string; label: string };

export async function getClassOptionsForDigest(): Promise<DigestClassOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id, name, period_number")
    .order("period_number", { ascending: true, nullsFirst: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    label:
      c.period_number != null ? `${c.name} · Period ${c.period_number}` : c.name,
  }));
}

export type DigestHistoryEntry = {
  id: string;
  subject: string;
  body: string;
  recipientCount: number;
  createdAt: string;
  sentByName: string | null;
  classLabels: string[] | null;
};

export async function getParentDigestHistory(): Promise<DigestHistoryEntry[]> {
  const admin = createAdminClient();
  const [{ data: rows }, classes] = await Promise.all([
    admin
      .from("parent_digests")
      .select("id, subject, body, class_ids, recipient_count, created_at, sent_by, users(first_name, last_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    getClassOptionsForDigest(),
  ]);
  const classLabelById = new Map(classes.map((c) => [c.id, c.label]));

  return (rows ?? []).map((r) => {
    const sender = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      subject: r.subject,
      body: r.body,
      recipientCount: r.recipient_count,
      createdAt: r.created_at,
      sentByName: sender
        ? `${sender.first_name} ${sender.last_name}`.trim() || null
        : null,
      classLabels: r.class_ids?.length
        ? r.class_ids.map((id) => classLabelById.get(id) ?? "Unknown class")
        : null,
    };
  });
}

export type SendDigestResult =
  | {
      ok: true;
      sentCount: number;
      skippedNoEmailCount: number;
      failedCount: number;
    }
  | { ok: false; error: string };

/**
 * Send a teacher-written digest to every in-scope student's parent email.
 * "In scope" = enrolled in one of `classIds`, or every student if `classIds`
 * is empty. Students with no parent email on file are silently skipped
 * (counted, not erred) — this is expected, not every family has one yet.
 */
export async function sendParentDigest(args: {
  subject: string;
  body: string;
  classIds: string[];
  senderId: string;
}): Promise<SendDigestResult> {
  const subject = args.subject.trim();
  const body = args.body.trim();
  if (!subject) return { ok: false, error: "Write a subject line first." };
  if (!body) return { ok: false, error: "Write a message first." };

  const admin = createAdminClient();

  let studentIds: string[] | null = null;
  if (args.classIds.length > 0) {
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("user_id")
      .in("class_id", args.classIds);
    studentIds = [...new Set((enrollments ?? []).map((e) => e.user_id))];
    if (studentIds.length === 0) {
      return { ok: false, error: "No students are enrolled in that class." };
    }
  }

  let query = admin
    .from("users")
    .select("id, parent_email, parent_email_2")
    .eq("role", "student");
  if (studentIds) query = query.in("id", studentIds);
  const { data: students } = await query;

  // Up to two emails per student. De-dupe (a shared family address, or the
  // same address entered twice) so nobody gets the digest twice.
  const isEmail = (e: string | null): e is string => !!e && e.includes("@");
  const recipients = [
    ...new Set(
      (students ?? []).flatMap((s) =>
        [s.parent_email, s.parent_email_2].filter(isEmail)
      )
    ),
  ];
  const skippedNoEmailCount = (students ?? []).filter(
    (s) => !isEmail(s.parent_email) && !isEmail(s.parent_email_2)
  ).length;

  if (recipients.length === 0) {
    return {
      ok: false,
      error:
        "None of the students in scope have a parent email on file yet — add one from a student's profile.",
    };
  }

  const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`;
  const results = await Promise.all(
    recipients.map((to) => sendEmail({ to, subject, html, text: body }))
  );

  // If every send was skipped for the same "not configured" reason, that's
  // one setup problem, not N failures — surface it as a single clear error.
  if (results.every((r) => !r.ok && "skipped" in r && r.skipped)) {
    const reason = (results[0] as { skipped: true; reason: string }).reason;
    return {
      ok: false,
      error: `Email isn't set up yet (${reason}) — nothing was sent.`,
    };
  }

  const failedCount = results.filter((r) => !r.ok).length;
  const sentCount = results.length - failedCount;

  await admin.from("parent_digests").insert({
    sent_by: args.senderId,
    subject,
    body,
    class_ids: args.classIds.length > 0 ? args.classIds : null,
    recipient_count: sentCount,
  });

  return { ok: true, sentCount, skippedNoEmailCount, failedCount };
}
