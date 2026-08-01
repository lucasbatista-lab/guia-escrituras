import {
  createMetaEventId,
  getPublicMetaPixelId,
  isMetaBrowserEventName,
  sanitizeMetaBrowserParams,
  type MetaBrowserEventName,
  type MetaBrowserEventParams,
  type MetaTrackOptions,
} from "./browser-events";

type FbqCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqCommand & { loaded?: boolean; callMethod?: FbqCommand; queue?: unknown[] };
    _fbq?: Window["fbq"];
  }
}

let initPixelId: string | null = null;
const firedKeys = new Set<string>();

function getFbq(): FbqCommand | null {
  if (typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

/** Load fbevents.js once. No-op without pixel id. Never sets advanced matching. */
export function ensureMetaPixelLoaded(pixelId: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  if (!pixelId) return false;

  if (initPixelId === pixelId && getFbq()) {
    return true;
  }

  if (!window.fbq) {
    const stub = function (...args: unknown[]) {
      const fbq = stub as typeof window.fbq;
      if (fbq?.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq!.queue = fbq!.queue || [];
        fbq!.queue.push(args);
      }
    } as NonNullable<Window["fbq"]>;
    stub.queue = [];
    stub.loaded = true;
    window.fbq = stub;
    if (!window._fbq) window._fbq = stub;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(script, first);
  }

  window.fbq!("init", pixelId);
  initPixelId = pixelId;
  return true;
}

export function disableMetaPixelRuntime(): void {
  initPixelId = null;
  firedKeys.clear();
}

export function trackMetaBrowserEvent<E extends MetaBrowserEventName>(
  event: E,
  params?: MetaBrowserEventParams[E],
  options?: Partial<MetaTrackOptions> & { dedupeKey?: string },
): { ok: true; eventId: string } | { ok: false; reason: string } {
  if (!isMetaBrowserEventName(event)) {
    return { ok: false, reason: "event_not_allowed" };
  }

  const pixelId = getPublicMetaPixelId();
  if (!pixelId) {
    return { ok: false, reason: "pixel_disabled" };
  }

  const sanitized = sanitizeMetaBrowserParams(event, params);
  if (sanitized === null) {
    return { ok: false, reason: "params_rejected" };
  }

  const dedupeKey = options?.dedupeKey;
  if (dedupeKey && firedKeys.has(dedupeKey)) {
    return { ok: false, reason: "duplicate" };
  }

  if (!ensureMetaPixelLoaded(pixelId)) {
    return { ok: false, reason: "load_failed" };
  }

  const fbq = getFbq();
  if (!fbq) {
    return { ok: false, reason: "fbq_missing" };
  }

  const eventId = options?.eventId?.trim() || createMetaEventId();
  fbq("track", event, sanitized, { eventID: eventId });
  if (dedupeKey) firedKeys.add(dedupeKey);
  return { ok: true, eventId };
}
