import "server-only";

/**
 * Secret key resolution — SERVER ONLY.
 * Prefer SUPABASE_SECRET_KEY; fall back to legacy SERVICE_ROLE_KEY.
 * Never import this module from Client Components.
 */

export function getSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function hasSupabaseSecretKey(): boolean {
  return Boolean(getSupabaseSecretKey());
}
