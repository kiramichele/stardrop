import { NextRequest, NextResponse } from "next/server";
import {
  verifyDailyWebhook,
  getGroupIdForRoomName,
  logVoiceEvent,
} from "@/lib/voice-server";

/**
 * Receives participant.joined / participant.left events from Daily.co so
 * voice_room_events has a real, server-verified join/leave log (not one
 * that depends on the student's browser reliably telling us when they
 * leave — a closed tab or lost connection still gets picked up here,
 * since Daily's own infra detects the disconnect and fires the webhook).
 *
 * ONE-TIME SETUP once this is deployed: register the webhook against
 * Daily's API (their dashboard doesn't expose webhook creation — this is
 * API-only) and save the returned `hmac` secret as DAILY_WEBHOOK_SECRET:
 *
 *   curl -X POST https://api.daily.co/v1/webhooks \
 *     -H "Authorization: Bearer $DAILY_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "url": "https://<your-deployed-domain>/api/webhooks/daily",
 *       "eventTypes": ["participant.joined", "participant.left"]
 *     }'
 *
 * The response includes an "hmac" field — that's DAILY_WEBHOOK_SECRET.
 * Until it's set, this route still logs events, just without verifying
 * they actually came from Daily (see verifyDailyWebhook's doc comment).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("X-Webhook-Timestamp");
  const signature = request.headers.get("X-Webhook-Signature");

  if (!verifyDailyWebhook(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    type?: string;
    payload?: { room?: string; user_id?: string };
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const roomName = body.payload?.room;
  const userId = body.payload?.user_id ?? null;

  if (
    (body.type === "participant.joined" || body.type === "participant.left") &&
    roomName
  ) {
    const groupId = await getGroupIdForRoomName(roomName);
    if (groupId) {
      await logVoiceEvent(
        groupId,
        userId,
        body.type === "participant.joined" ? "joined" : "left"
      );
    }
  }

  // Daily doesn't inspect the response body, just the status.
  return NextResponse.json({ ok: true });
}
