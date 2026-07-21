/**
 * Accept only same-origin relative paths for auth redirects.
 * Rejects open redirects (protocol-relative, absolute URLs, schemes).
 * Colons are forbidden in the pathname (blocks `/javascript:…`) but allowed
 * in the query string so resume params like `tema=João 3:16` survive login.
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
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;
  if (trimmed.length > 512) return fallback;
  if (trimmed.toLowerCase().startsWith("/\\")) return fallback;

  const qIndex = trimmed.indexOf("?");
  const pathPart = qIndex === -1 ? trimmed : trimmed.slice(0, qIndex);
  const queryPart = qIndex === -1 ? "" : trimmed.slice(qIndex + 1);

  if (pathPart.includes(":")) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  // Block scheme smuggling and absolute URLs in the query.
  if (/(?:^|[&=/])(?:javascript|data|vbscript)\s*:/i.test(queryPart)) {
    return fallback;
  }
  if (/https?\s*:/i.test(trimmed)) return fallback;

  return trimmed;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

/** Allowlisted journey/catalog path segments (slug or step id). */
export function sanitizePathSegment(
  raw: string | null | undefined,
  maxLen = 80,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.length > maxLen) return null;
  if (!/^[a-z0-9-]+$/.test(trimmed)) return null;
  return trimmed;
}

function firstSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Build a safe `/conversar` resume path from request search params.
 * Only allowlists conversation id (UUID), tema (length-bounded), and journey prefill.
 */
export function buildConversarResumePath(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();

  const conversationId = firstSearchValue(searchParams.c)?.trim();
  if (conversationId && isUuid(conversationId)) {
    qs.set("c", conversationId);
  }

  const temaRaw = firstSearchValue(searchParams.tema);
  if (typeof temaRaw === "string") {
    const tema = temaRaw
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);
    if (tema.length > 0) qs.set("tema", tema);
  }

  const jornada = sanitizePathSegment(firstSearchValue(searchParams.jornada));
  const etapa = sanitizePathSegment(firstSearchValue(searchParams.etapa));
  if (jornada && etapa) {
    qs.set("jornada", jornada);
    qs.set("etapa", etapa);
  }

  const query = qs.toString();
  return query ? `/conversar?${query}` : "/conversar";
}

/** Safe journey deep link; falls back to catalog when segments are hostile. */
export function buildJourneyResumePath(
  slug: string | null | undefined,
  step?: string | null | undefined,
): string {
  const safeSlug = sanitizePathSegment(slug);
  if (!safeSlug) return "/jornadas";
  const safeStep = sanitizePathSegment(step);
  if (step != null && step !== "" && !safeStep) return `/jornadas/${safeSlug}`;
  if (safeStep) return `/jornadas/${safeSlug}/${safeStep}`;
  return `/jornadas/${safeSlug}`;
}

/** Login href with encoded `next` so nested query strings stay intact. */
export function buildLoginHref(
  nextPath: string,
  fallback = "/inicio",
): string {
  const safe = safeNextPath(nextPath, fallback);
  return `/entrar?next=${encodeURIComponent(safe)}`;
}
