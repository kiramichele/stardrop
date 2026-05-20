/**
 * Validate a post-login "next" destination.
 *
 * Returns the value only if it is a safe, same-origin relative path —
 * this guards against open-redirect attacks (a crafted `?next=` that would
 * send a freshly-logged-in user to an attacker's site).
 *
 * Pure string logic only, so it is safe to use in edge middleware.
 */
export function safeRedirectPath(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  // Must be an absolute path on this origin.
  if (!value.startsWith("/")) return null;
  // Protocol-relative ("//evil.com") and backslash variants ("/\evil.com")
  // are treated as external URLs by browsers — reject them.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // Never bounce back to the login page itself (would loop).
  const pathOnly = value.split(/[?#]/)[0];
  if (pathOnly === "/login") return null;
  return value;
}
