import type { NextRequest } from "next/server";

/**
 * Optimistic presence check for Supabase SSR auth cookies.
 * Not a cryptographic validation — layouts/handlers remain authoritative.
 */
export function hasLikelySupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name.startsWith("sb-") &&
      name.includes("auth-token") &&
      Boolean(cookie.value?.trim())
    );
  });
}
