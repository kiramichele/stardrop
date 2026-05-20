import { createAdminClient } from "@/lib/supabase/admin";
import { asProfile } from "@/lib/profile";
import { sendEmail, escapeHtml, appBaseUrl } from "@/lib/email";
import type { Json } from "@/types/database";

export type NotificationType =
  | "discussion_post"
  | "discussion_reply"
  | "discussion_mention";

export type NotificationPayload = {
  message: string;
  href: string;
  actorName?: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  href: string;
  actorName: string | null;
  read: boolean;
  createdAt: string | null;
};

export type NewNotification = {
  userId: string;
  type: NotificationType;
  payload: NotificationPayload;
};

/**
 * Create in-app notifications and (best-effort) email recipients who have
 * email notifications turned on. Self-notifications and duplicate user ids
 * are dropped by the caller — keep `rows` already de-duped.
 */
export async function createNotifications(rows: NewNotification[]) {
  if (rows.length === 0) return;
  const admin = createAdminClient();

  const { data: inserted } = await admin
    .from("notifications")
    .insert(
      rows.map((r) => ({
        user_id: r.userId,
        type: r.type,
        payload: r.payload as unknown as Json,
      }))
    )
    .select("id, user_id");

  // Email the ones who want it.
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const { data: users } = await admin
    .from("users")
    .select("*")
    .in("id", userIds);
  const profileById = new Map(
    (users ?? []).map((u) => [asProfile(u).id, asProfile(u)])
  );

  const appUrl = appBaseUrl();

  await Promise.all(
    rows.map(async (r) => {
      const profile = profileById.get(r.userId);
      if (!profile || !profile.email_notifications) return;
      if (!profile.real_email || !profile.real_email.includes("@")) return;
      const link = appUrl ? `${appUrl}${r.payload.href}` : null;
      await sendEmail({
        to: profile.real_email,
        subject: r.payload.message,
        html: `<p>${escapeHtml(r.payload.message)}</p>${
          link ? `<p><a href="${link}">Open in Stardrop</a></p>` : ""
        }`,
        text: `${r.payload.message}${link ? `\n\n${link}` : ""}`,
      });
    })
  );

  // Mark which ones got emailed (best-effort; failure here is harmless).
  const emailedIds = (inserted ?? [])
    .filter((n) => {
      const p = profileById.get(n.user_id);
      return !!p && p.email_notifications && !!p.real_email;
    })
    .map((n) => n.id);
  if (emailedIds.length > 0) {
    await admin
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .in("id", emailedIds);
  }
}

function payloadField(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

export async function getNotifications(
  userId: string
): Promise<NotificationItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    message: payloadField(n.payload, "message") ?? "Notification",
    href: payloadField(n.payload, "href") ?? "/discussions",
    actorName: payloadField(n.payload, "actorName"),
    read: n.read_at !== null,
    createdAt: n.created_at,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
