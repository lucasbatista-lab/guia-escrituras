/**
 * Accept only same-origin relative paths for auth redirects.
 * Rejects open redirects (protocol-relative, absolute URLs, schemes).
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/inicio",
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  if (trimmed.toLowerCase().startsWith("/\\")) return fallback;
  // Disallow embedding absolute URLs after the path
  if (/https?:/i.test(trimmed)) return fallback;
  return trimmed;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}
