import { NextResponse } from "next/server";

/**
 * Diagnostic: reports whether the deployed app actually sees PISTON_URL at
 * runtime (without revealing anything secret — the value is just a droplet
 * URL). Open it in a logged-in browser: /api/debug/piston
 */
export async function GET() {
  const url = process.env.PISTON_URL ?? null;
  let host: string | null = null;
  try {
    if (url) host = new URL(url.includes("://") ? url : `http://${url}`).host;
  } catch {
    /* ignore parse errors */
  }
  return NextResponse.json({
    configured: !!url,
    host, // e.g. "198.199.66.142:2000" when set; null means using the default
    endsWithApiV2: url ? /\/api\/v2\/?$/.test(url) : null,
    // Never the full value if it somehow contained a secret; just its length.
    valueLength: url ? url.length : 0,
  });
}
