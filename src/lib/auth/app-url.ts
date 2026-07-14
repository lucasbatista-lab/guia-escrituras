import { getAppRuntime } from "@/config/runtime";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let value = raw.trim();
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Canonical public origin for SEO, emails and Stripe returns.
 * Never returns localhost when running in production.
 */
export function getCanonicalSiteUrl(): string {
  const envCandidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ];

  for (const candidate of envCandidates) {
    const origin = normalizeOrigin(candidate);
    if (!origin) continue;
    if (getAppRuntime() === "production" && isLocalHost(new URL(origin).hostname)) {
      continue;
    }
    return origin;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const origin = normalizeOrigin(vercel.startsWith("http") ? vercel : `https://${vercel}`);
    if (origin) return origin;
  }

  if (getAppRuntime() === "production") {
    // Last safe fallback on Vercel production without APP_URL — still not localhost.
    return "https://amemchat.com.br";
  }

  return "http://localhost:3000";
}

/**
 * Canonical app origin for Auth redirects (email confirmation, callbacks).
 * Prefer APP_URL on the server; fall back to NEXT_PUBLIC_APP_URL.
 */
export function getAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";

  if (!raw) {
    if (getAppRuntime() === "production") {
      return getCanonicalSiteUrl();
    }
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (getAppRuntime() === "production" && isLocalHost(url.hostname)) {
      return getCanonicalSiteUrl();
    }
    return url.origin;
  } catch {
    return "";
  }
}

/**
 * Email confirmation RedirectTo base on /auth/confirm (canonical domain).
 * Supabase template must append: &token_hash={{ .TokenHash }}&type=email
 *
 * With plan: next continues subscription (/email-confirmado).
 * Without plan: next is /planos.
 */
export function getEmailRedirectTo(nextPath = "/planos"): string {
  const origin = getAppUrl() || getCanonicalSiteUrl();
  const next = nextPath.startsWith("/") ? nextPath : "/planos";
  if (!origin) {
    throw new Error("APP_URL_or_NEXT_PUBLIC_APP_URL_missing");
  }
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

/** Build confirm redirect including opaque intent token. */
export function getEmailRedirectToWithIntent(
  intentToken: string,
  nextPath = "/email-confirmado",
): string {
  const origin = getAppUrl() || getCanonicalSiteUrl();
  if (!origin) {
    throw new Error("APP_URL_or_NEXT_PUBLIC_APP_URL_missing");
  }
  const next = nextPath.startsWith("/") ? nextPath : "/email-confirmado";
  const params = new URLSearchParams({
    intent: intentToken,
    next,
  });
  return `${origin}/auth/confirm?${params.toString()}`;
}
