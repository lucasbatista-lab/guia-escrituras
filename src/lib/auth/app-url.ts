/**
 * Canonical app origin for Auth redirects (email confirmation, callbacks).
 * Prefer APP_URL on the server; fall back to NEXT_PUBLIC_APP_URL.
 */
export function getAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";

  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function getEmailRedirectTo(nextPath = "/onboarding"): string {
  const origin = getAppUrl();
  const next = nextPath.startsWith("/") ? nextPath : "/onboarding";
  if (!origin) {
    throw new Error("APP_URL_or_NEXT_PUBLIC_APP_URL_missing");
  }
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
