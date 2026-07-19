/**
 * Production host normalization (www → apex) for the request proxy layer.
 * Localhost and *.vercel.app must never be rewritten.
 */

export const PRODUCTION_APEX_HOST = "amemchat.com.br";
export const PRODUCTION_WWW_HOST = "www.amemchat.com.br";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  if (LOCAL_HOSTS.has(host)) return true;
  return host.endsWith(".local");
}

export function isVercelPreviewHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === "vercel.app" || host.endsWith(".vercel.app");
}

/**
 * Resolve a safe hostname from NextRequest URL parsing.
 * Rejects empty/malformed values; never trusts raw Host for redirect targets.
 */
export function resolveSafeHostname(hostname: string | null | undefined): string | null {
  if (hostname == null) return null;
  const host = hostname.trim().toLowerCase();
  if (!host) return null;
  // Host header injection / path smuggling
  if (host.includes("/") || host.includes("\\") || host.includes(" ") || host.includes("@")) {
    return null;
  }
  if (host.includes(":") && !host.startsWith("[")) {
    // Strip non-IPv6 port if present (hostname from URL should not include port,
    // but defend against callers passing Host header values).
    const withoutPort = host.replace(/:\d+$/, "");
    if (!withoutPort || withoutPort.includes(":")) return null;
    return withoutPort;
  }
  return host;
}

/**
 * When the request host is production www, return the apex absolute URL
 * preserving path and query. Otherwise null (no redirect).
 */
export function buildWwwToApexRedirectHref(input: {
  hostname: string | null | undefined;
  pathname: string;
  search: string;
}): string | null {
  const hostname = resolveSafeHostname(input.hostname);
  if (!hostname) return null;
  if (isLocalHostname(hostname)) return null;
  if (isVercelPreviewHostname(hostname)) return null;
  if (hostname !== PRODUCTION_WWW_HOST) return null;

  const path = input.pathname.startsWith("/") ? input.pathname : `/${input.pathname}`;
  const search = input.search.startsWith("?")
    ? input.search
    : input.search
      ? `?${input.search}`
      : "";

  return `https://${PRODUCTION_APEX_HOST}${path}${search}`;
}
