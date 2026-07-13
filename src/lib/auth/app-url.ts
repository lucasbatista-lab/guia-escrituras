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

export function getEmailRedirectTo(nextPath = "/onboarding"): string {
  const origin = getAppUrl() || getCanonicalSiteUrl();
  const next = nextPath.startsWith("/") ? nextPath : "/onboarding";
  if (!origin) {
    throw new Error("APP_URL_or_NEXT_PUBLIC_APP_URL_missing");
  }
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
