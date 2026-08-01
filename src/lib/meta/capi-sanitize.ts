import "server-only";

import {
  isMetaCapiEventName,
  type MetaCapiCustomData,
  type MetaCapiEventInput,
  type MetaCapiUserData,
} from "./capi-types";

const FBP_RE = /^fb\.1\.\d+\.\d+$/;
const FBC_RE = /^fb\.1\.\d+\.[A-Za-z0-9._-]+$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

export function sanitizeFbp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 128);
  return FBP_RE.test(trimmed) ? trimmed : null;
}

export function sanitizeFbc(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 256);
  return FBC_RE.test(trimmed) ? trimmed : null;
}

export function sanitizeEventSourceUrl(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Drop query/hash — UTMs/PII must not ride along to Meta.
    return `${url.origin}${url.pathname}`.slice(0, 1024);
  } catch {
    return null;
  }
}

export function sanitizeEventId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim().slice(0, 128);
  if (!/^[A-Za-z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeUserData(
  userData: MetaCapiUserData | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const fbp = sanitizeFbp(userData?.fbp);
  const fbc = sanitizeFbc(userData?.fbc);
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;
  return out;
}

function sanitizeCustomData(
  customData: MetaCapiCustomData | undefined,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (
    typeof customData?.value === "number" &&
    Number.isFinite(customData.value) &&
    customData.value >= 0 &&
    customData.value <= 1_000_000
  ) {
    out.value = Math.round(customData.value * 100) / 100;
  }
  if (
    typeof customData?.currency === "string" &&
    CURRENCY_RE.test(customData.currency)
  ) {
    out.currency = customData.currency;
  }
  return out;
}

/**
 * Build a Graph API event payload from an allowlisted input.
 * Rejects unknown event names and strips every non-allowlisted field.
 */
export function buildCapiEventPayload(
  input: MetaCapiEventInput,
): Record<string, unknown> | null {
  if (!isMetaCapiEventName(input.eventName)) return null;
  const eventId = sanitizeEventId(input.eventId);
  if (!eventId) return null;
  if (input.actionSource !== "website") return null;
  if (
    typeof input.eventTime !== "number" ||
    !Number.isFinite(input.eventTime) ||
    input.eventTime <= 0
  ) {
    return null;
  }

  const payload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(input.eventTime),
    event_id: eventId,
    action_source: "website",
    user_data: sanitizeUserData(input.userData),
  };

  const sourceUrl = sanitizeEventSourceUrl(input.eventSourceUrl);
  if (sourceUrl) payload.event_source_url = sourceUrl;

  const custom = sanitizeCustomData(input.customData);
  if (Object.keys(custom).length > 0) {
    payload.custom_data = custom;
  }

  return payload;
}
