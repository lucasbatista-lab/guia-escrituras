/**
 * Public Supabase key resolution.
 * Prefer publishable key; keep anon key as temporary fallback.
 * Never include secret/service role here — this module is client-safe.
 */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
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
