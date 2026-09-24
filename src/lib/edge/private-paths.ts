/**
 * Private app surfaces that anonymous visitors must not render.
 * Keep in sync with src/lib/supabase/proxy.ts gate prefixes.
 *
 * Exception: /hoje/YYYY-MM-DD (and other single-segment /hoje/*) is the
 * public editorial share permalink — not the authenticated ritual.
 */

export const PRIVATE_PLATFORM_PREFIXES = [
  "/inicio",
  "/hoje",
  "/conversar",
  "/conversas",
  "/jornada",
  "/jornadas",
  "/conta",
  "/onboarding",
  "/personalizar",
  "/assinar",
  "/assinatura",
  "/espaco",
] as const;

export const PRIVATE_ADMIN_PREFIXES = ["/admin"] as const;

/**
 * Public daily share / permalink under the marketing route.
 * /hoje stays private; /hoje/<segment> is public editorial.
 */
export function isPublicDailySharePath(pathname: string): boolean {
  return /^\/hoje\/[^/]+$/.test(pathname);
}

export function matchesPathPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Platform private gate with public Hoje share carve-out. */
export function matchesPrivatePlatformPath(pathname: string): boolean {
  if (isPublicDailySharePath(pathname)) return false;
  return matchesPathPrefix(pathname, PRIVATE_PLATFORM_PREFIXES);
}

export function isPrivateAppPath(pathname: string): boolean {
  return (
    matchesPrivatePlatformPath(pathname) ||
    matchesPathPrefix(pathname, PRIVATE_ADMIN_PREFIXES)
  );
}

/** HTML document gates only — APIs keep JSON 401/403. */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Auth callback/confirm must remain reachable without login bounce. */
export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}
