import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// voice_rooms / voice_room_events are new tables not yet in the generated
// types/database.ts — same untyped-cast convention used elsewhere in the
// codebase for tables ahead of a types regen (see e.g. starhub-server.ts).
type AnyTable = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
function untyped(admin: ReturnType<typeof createAdminClient>): AnyTable {
  return admin as unknown as AnyTable;
}

/**
 * Optional voice chat for collaborative groups, backed by Daily.co
 * (https://daily.co). One room per group, created lazily on first join.
 * No-ops / self-hides everywhere the app checks isVoiceChatConfigured(),
 * same spirit as isTtsConfigured() for ElevenLabs.
 *
 * Required env:
 *   - DAILY_API_KEY
 * Optional env:
 *   - DAILY_WEBHOOK_SECRET — the hmac secret from creating the
 *     /api/webhooks/daily webhook via Daily's REST API (see that route's
 *     doc comment for the one-time setup command). Without it, join/leave
 *     events are still logged, just without verifying they really came
 *     from Daily — fine for a low-stakes activity log, but set it once
 *     the webhook is registered.
 */

const API_BASE = "https://api.daily.co/v1";
// Long-lived so a group's room outlives the assignment (revisions, review
// after grading, etc.) without us having to track due dates here too.
const ROOM_LIFETIME_SECONDS = 60 * 60 * 24 * 180; // ~6 months
const MEETING_TOKEN_LIFETIME_SECONDS = 60 * 60 * 4; // 4 hours

export function isVoiceChatConfigured(): boolean {
  return !!process.env.DAILY_API_KEY;
}

function apiKey(): string {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY not set");
  return key;
}

async function dailyFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  return res;
}

type VoiceRoomRow = {
  id: string;
  group_id: string;
  daily_room_name: string;
  daily_room_url: string;
};

/**
 * The group's voice room, creating it on Daily (and recording it) on
 * first call. A random, unguessable room name — the room is also marked
 * "private" on Daily's side, so a bare link isn't enough to join anyway;
 * a caller still needs a meeting token (mintMeetingToken).
 */
export async function getOrCreateVoiceRoom(
  groupId: string
): Promise<{ ok: true; roomName: string; roomUrl: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: existing } = (await untyped(admin)
    .from("voice_rooms")
    .select("daily_room_name, daily_room_url")
    .eq("group_id", groupId)
    .maybeSingle()) as {
    data: Pick<VoiceRoomRow, "daily_room_name" | "daily_room_url"> | null;
  };
  if (existing) {
    return { ok: true, roomName: existing.daily_room_name, roomUrl: existing.daily_room_url };
  }

  const roomName = `sd-${crypto.randomUUID()}`;
  const res = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + ROOM_LIFETIME_SECONDS,
        start_video_off: true,
        enable_chat: false,
        enable_screenshare: false,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `Couldn't create voice room (${res.status}): ${detail.slice(0, 200)}` };
  }
  const room = (await res.json()) as { name: string; url: string };

  const { error } = await untyped(admin).from("voice_rooms").insert({
    group_id: groupId,
    daily_room_name: room.name,
    daily_room_url: room.url,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, roomName: room.name, roomUrl: room.url };
}

/** A short-lived token authorizing one user into one private room. */
export async function mintMeetingToken(
  roomName: string,
  user: { id: string; name: string }
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const res = await dailyFetch("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: user.name,
        user_id: user.id,
        exp: Math.floor(Date.now() / 1000) + MEETING_TOKEN_LIFETIME_SECONDS,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `Couldn't authorize voice chat (${res.status}): ${detail.slice(0, 200)}` };
  }
  const data = (await res.json()) as { token: string };
  return { ok: true, token: data.token };
}

/** Record a join/leave — called from the Daily webhook (see that route). */
export async function logVoiceEvent(
  groupId: string,
  userId: string | null,
  event: "joined" | "left"
): Promise<void> {
  const admin = createAdminClient();
  await untyped(admin).from("voice_room_events").insert({
    group_id: groupId,
    user_id: userId,
    event,
  });
}

/** Look up which group owns a Daily room name — for the webhook handler. */
export async function getGroupIdForRoomName(
  roomName: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = (await untyped(admin)
    .from("voice_rooms")
    .select("group_id")
    .eq("daily_room_name", roomName)
    .maybeSingle()) as { data: { group_id: string } | null };
  return data?.group_id ?? null;
}

/**
 * Verifies a Daily webhook per their documented scheme: HMAC-SHA256 over
 * `${timestamp}.${rawBody}`, secret base64-decoded, compared to the
 * X-Webhook-Signature header (also base64). Returns true (and logs a
 * warning) when DAILY_WEBHOOK_SECRET isn't set yet, so events still get
 * logged best-effort before that one-time setup step is done.
 */
export function verifyDailyWebhook(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "DAILY_WEBHOOK_SECRET not set — accepting Daily webhook unverified. " +
        "See app/api/webhooks/daily/route.ts for one-time setup."
    );
    return true;
  }
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${timestamp}.${rawBody}`)
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type VoicePresenceEntry = {
  userId: string | null;
  userName: string;
  joinTime: string;
};

/**
 * Who's actually in a group's room right now, straight from Daily's own
 * servers — not derived from our webhook log, so a missed "left" webhook
 * can't leave someone stuck looking present forever.
 */
export async function getVoicePresence(
  roomName: string
): Promise<VoicePresenceEntry[]> {
  const res = await dailyFetch(`/rooms/${encodeURIComponent(roomName)}/presence`);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: { userId?: string; userName?: string; joinTime?: string }[];
  };
  return (data.data ?? []).map((p) => ({
    userId: p.userId ?? null,
    userName: p.userName ?? "Someone",
    joinTime: p.joinTime ?? new Date().toISOString(),
  }));
}

/**
 * Live presence for every group's room that has one, keyed by group_id.
 * Groups with no room yet (nobody's ever clicked "Join voice chat")
 * simply don't appear.
 */
export async function getVoicePresenceForGroups(
  groupIds: string[]
): Promise<Map<string, VoicePresenceEntry[]>> {
  const out = new Map<string, VoicePresenceEntry[]>();
  if (groupIds.length === 0 || !isVoiceChatConfigured()) return out;

  const admin = createAdminClient();
  const { data: rooms } = (await untyped(admin)
    .from("voice_rooms")
    .select("group_id, daily_room_name")
    .in("group_id", groupIds)) as {
    data: { group_id: string; daily_room_name: string }[] | null;
  };
  if (!rooms || rooms.length === 0) return out;

  await Promise.all(
    rooms.map(async (r) => {
      const presence = await getVoicePresence(r.daily_room_name);
      if (presence.length > 0) out.set(r.group_id, presence);
    })
  );
  return out;
}
