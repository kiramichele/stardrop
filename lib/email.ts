import { Resend } from "resend";

/**
 * Thin Resend wrapper. No-ops cleanly when RESEND_API_KEY or EMAIL_FROM
 * isn't configured, so callers can fire-and-forget without breaking
 * primary flows (e.g. a feedback reply still saves even if email fails).
 *
 * Required env vars:
 *   - RESEND_API_KEY  (Resend dashboard → API Keys)
 *   - EMAIL_FROM      (e.g. "Stardrop <notifications@yourdomain.com>")
 *                     The sender domain must be verified in Resend.
 * Optional:
 *   - NEXT_PUBLIC_APP_URL  (used by callers to build absolute links)
 */

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendEmail(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not set" };
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, skipped: true, reason: "EMAIL_FROM not set" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.text ? { text: opts.text } : {}),
    });
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Resend returned no message id" };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Minimal HTML escape for body interpolation. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The app's public base URL for absolute links in emails, e.g.
 * "https://stardrop.studio". Reads NEXT_PUBLIC_APP_URL and tolerates a
 * missing scheme ("stardrop.studio" -> "https://stardrop.studio") and any
 * trailing slash. Returns "" when unset so callers can omit the link.
 */
export function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Send a freshly-reset password to a user. Best-effort (see sendEmail). */
export async function sendNewPasswordEmail(
  to: string,
  firstName: string,
  password: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Your Stardrop password was reset",
    html: `<p>Hi ${escapeHtml(firstName)},</p>
<p>Your Stardrop password has been reset. Your new password is:</p>
<p style="font-size:1.25em;font-family:monospace;background:#fbf6ea;padding:0.4em 0.7em;border-radius:8px;display:inline-block;"><strong>${escapeHtml(
      password
    )}</strong></p>
<p>Sign in with your username and this password. You can change it again any time from your profile page.</p>`,
    text: `Hi ${firstName},\n\nYour Stardrop password has been reset. Your new password is:\n\n${password}\n\nSign in with your username and this password.`,
  });
}
