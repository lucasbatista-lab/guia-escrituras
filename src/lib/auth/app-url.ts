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
    // Prefer apex for the production brand domain so Checkout returns match
    // the same host family as shared auth cookies (.amemchat.com.br).
    if (
      url.hostname === "www.amemchat.com.br" ||
      url.hostname === "amemchat.com.br"
    ) {
      return "https://amemchat.com.br";
    }
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
    // Public/canonical surface must not expose *.vercel.app to clients.
    if (getAppRuntime() === "production" && isVercelAppHost(origin)) {
      continue;
    }
    return origin;
  }

  if (getAppRuntime() === "production") {
    // Canonical production origin (apex). Configure APP_URL; do not show Vercel URLs.
    return "https://amemchat.com.br";
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const origin = normalizeOrigin(vercel.startsWith("http") ? vercel : `https://${vercel}`);
    if (origin) return origin;
  }

  return "http://localhost:3000";
}

function isVercelAppHost(origin: string): boolean {
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
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

  const origin = normalizeOrigin(raw);
  if (!origin) return "";

  try {
    if (getAppRuntime() === "production" && isLocalHost(new URL(origin).hostname)) {
      return getCanonicalSiteUrl();
    }
    if (getAppRuntime() === "production" && isVercelAppHost(origin)) {
      return getCanonicalSiteUrl();
    }
    return origin;
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

/**
 * Password recovery RedirectTo base on /auth/confirm (canonical domain).
 * Supabase template must append: &token_hash={{ .TokenHash }}&type=recovery
 */
export function getPasswordRecoveryRedirectTo(): string {
  return getEmailRedirectTo("/redefinir-senha");
}
