/**
 * Typed browser Meta events — strict allowlist, no arbitrary properties.
 * Never send email, phone, external_id, conversation content, or tradition.
 */

export const META_BROWSER_EVENTS = [
  "PageView",
  "ViewContent",
  "Lead",
] as const;

export type MetaBrowserEventName = (typeof META_BROWSER_EVENTS)[number];

export type MetaBrowserEventParams = {
  PageView: Record<string, never>;
  ViewContent: {
    content_name?: "paid_landing";
    content_category?: "landing";
  };
  Lead: Record<string, never>;
};

export type MetaTrackOptions = {
  eventId: string;
};

const ALLOWED_PARAM_KEYS: Record<MetaBrowserEventName, readonly string[]> = {
  PageView: [],
  ViewContent: ["content_name", "content_category"],
  Lead: [],
};

export function isMetaBrowserEventName(
  value: string,
): value is MetaBrowserEventName {
  return (META_BROWSER_EVENTS as readonly string[]).includes(value);
}

/** Strip unknown keys; reject disallowed event names. */
export function sanitizeMetaBrowserParams<E extends MetaBrowserEventName>(
  event: E,
  params: MetaBrowserEventParams[E] | Record<string, unknown> | undefined,
): MetaBrowserEventParams[E] | null {
  if (!isMetaBrowserEventName(event)) return null;
  if (!params || typeof params !== "object") {
    return {} as MetaBrowserEventParams[E];
  }
  const allowed = new Set(ALLOWED_PARAM_KEYS[event]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key)) continue;
    if (typeof value === "string" && value.length <= 64) {
      out[key] = value;
    }
  }
  return out as MetaBrowserEventParams[E];
}

export function createMetaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `meta_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Public funnel surfaces where the Pixel may load (never Admin/product). */
export const META_PIXEL_PATH_ALLOWLIST = [
  "/comece",
  "/planos",
  "/cadastro",
  "/confira-seu-email",
  "/email-confirmado",
  "/assinar/continuar",
] as const;

export function isMetaPixelSurface(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  return (META_PIXEL_PATH_ALLOWLIST as readonly string[]).includes(path);
}

export function getPublicMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
  if (!id) return null;
  if (!/^\d{5,20}$/.test(id)) return null;
  return id;
}
