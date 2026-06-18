import twilio from "twilio";

/**
 * Thin Twilio wrapper for the opt-in SMS notifications. Mirrors the email
 * lib pattern: no-ops cleanly when env vars aren't set so callers can
 * fire-and-forget without breaking primary flows.
 *
 * Required env vars (set all four to enable SMS):
 *   - TWILIO_ACCOUNT_SID         (Twilio console → Account)
 *   - TWILIO_AUTH_TOKEN          (Twilio console → Account)
 *   - TWILIO_FROM_NUMBER         (your A2P-registered Twilio number, E.164)
 *   - TWILIO_VERIFY_SERVICE_SID  (Twilio console → Verify → create a Service)
 */

type TwilioClient = ReturnType<typeof twilio>;

let _client: TwilioClient | null = null;
function getClient(): TwilioClient | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return _client;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export type SendSmsResult =
  | { ok: true; sid: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

/** Send a one-off SMS to a verified phone number. */
export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, skipped: true, reason: "Twilio not configured" };
  }
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    return { ok: false, skipped: true, reason: "TWILIO_FROM_NUMBER not set" };
  }
  try {
    const msg = await client.messages.create({
      to: opts.to,
      from,
      body: opts.body,
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/** Text a one-time code to the given phone (Twilio Verify). */
export async function startPhoneVerification(
  phoneE164: string
): Promise<VerifyResult> {
  const client = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!client || !serviceSid) {
    return { ok: false, error: "SMS verification isn't configured yet." };
  }
  try {
    await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneE164, channel: "sms" });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Check a one-time code against the most recent verification. */
export async function checkPhoneVerification(
  phoneE164: string,
  code: string
): Promise<VerifyResult> {
  const client = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!client || !serviceSid) {
    return { ok: false, error: "SMS verification isn't configured yet." };
  }
  try {
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneE164, code });
    if (check.status === "approved") return { ok: true };
    return { ok: false, error: "That code didn't match. Try again." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Normalize a US-style phone number to E.164. Returns null when it
 * doesn't look like a valid 10/11-digit US number or an already-E.164
 * international one.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}
