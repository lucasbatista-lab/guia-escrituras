import "server-only";

/** Stripe metadata values are capped at 500 characters. */
export const STRIPE_METADATA_VALUE_MAX = 500;

/** Meta CAPI client_user_agent practical limit (below Stripe cap). */
export const META_CLIENT_UA_MAX = 480;

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const IPV6_RE =
  /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$/;

function isValidIpv4(value: string): boolean {
  return IPV4_RE.test(value);
}

function isValidIpv6(value: string): boolean {
  if (value.length > 45) return false;
  return IPV6_RE.test(value);
}

/** Validate client IP for Meta CAPI (not hashed). */
export function sanitizeClientIp(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim().slice(0, 45);
  if (isValidIpv4(trimmed) || isValidIpv6(trimmed)) return trimmed;
  return null;
}

/** Sanitize User-Agent for Meta CAPI and Stripe metadata persistence. */
export function sanitizeClientUserAgent(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const cleaned = value
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, META_CLIENT_UA_MAX);
  return cleaned.length > 0 ? cleaned : null;
}

export function truncateStripeMetadataValue(
  value: string,
  max = STRIPE_METADATA_VALUE_MAX,
): string {
  return value.slice(0, max);
}

type HeaderSource = {
  get(name: string): string | null;
};

/**
 * Extract the client IP from Vercel/proxy headers.
 * Uses the first valid IP in x-forwarded-for, then x-real-ip.
 */
export function extractClientIpFromHeaders(headers: HeaderSource): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    for (const part of xff.split(",")) {
      const ip = sanitizeClientIp(part.trim());
      if (ip) return ip;
    }
  }
  return sanitizeClientIp(headers.get("x-real-ip"));
}

export function extractClientUserAgentFromHeaders(
  headers: HeaderSource,
): string | null {
  return sanitizeClientUserAgent(headers.get("user-agent"));
}
