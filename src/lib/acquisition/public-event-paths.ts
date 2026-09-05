/** Allowlisted paths for first-party public conversion beacons. */
export const PUBLIC_CONVERSION_PATH_ALLOWLIST = [
  "/",
  "/comece",
  "/comece-v2",
  "/planos",
  "/cadastro",
  "/confira-seu-email",
  "/email-confirmado",
  "/assinar/continuar",
] as const;

export type PublicConversionPath =
  (typeof PUBLIC_CONVERSION_PATH_ALLOWLIST)[number];

export function isPublicConversionPath(
  path: string | null | undefined,
): path is PublicConversionPath {
  if (!path) return false;
  return (PUBLIC_CONVERSION_PATH_ALLOWLIST as readonly string[]).includes(path);
}
