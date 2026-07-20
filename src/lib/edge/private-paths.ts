/**
 * Private app surfaces that anonymous visitors must not render.
 * Keep in sync with src/lib/supabase/proxy.ts gate prefixes.
 */

export const PRIVATE_PLATFORM_PREFIXES = [
  "/inicio",
  "/conversar",
  "/conversas",
  "/jornada",
  "/jornadas",
  "/conta",
  "/onboarding",
  "/personalizar",
  "/assinar",
  "/assinatura",
] as const;

export const PRIVATE_ADMIN_PREFIXES = ["/admin"] as const;

export function matchesPathPrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPrivateAppPath(pathname: string): boolean {
  return (
    matchesPathPrefix(pathname, PRIVATE_PLATFORM_PREFIXES) ||
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
