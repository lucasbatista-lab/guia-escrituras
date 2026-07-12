/**
 * Public Supabase key resolution.
 * Prefer publishable key; keep anon key as temporary fallback.
 * Never include secret/service role here — this module is client-safe.
 */

/**
 * Normalize common NEXT_PUBLIC_SUPABASE_URL mistakes that break browser Auth.
 * Observed in production: `tps://...` (missing `ht` from `https`).
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("tps://")) {
    return `https://${trimmed.slice("tps://".length)}`;
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed.replace(/\/$/, "");
  }

  // Host-only values (e.g. xyz.supabase.co)
  return `https://${trimmed.replace(/\/$/, "")}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabaseUrl(): string {
  const normalized = normalizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  return isValidHttpUrl(normalized) ? normalized : "";
}

/** Prefer publishable; fall back to legacy anon. */
export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/** @deprecated Use getSupabasePublishableKey — kept for call-site clarity during migration. */
export function getSupabaseAnonKey(): string {
  return getSupabasePublishableKey();
}

export function hasSupabaseEnv(): boolean {
  return hasSupabasePublicEnv();
}
