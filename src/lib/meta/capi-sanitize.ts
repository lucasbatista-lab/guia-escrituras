import "server-only";

import {
  isMetaCapiEventName,
  type MetaCapiCustomData,
  type MetaCapiEventInput,
  type MetaCapiUserData,
} from "./capi-types";
import { hashMetaEmail, hashMetaExternalId } from "./capi-hash";
import {
  sanitizeClientIp,
  sanitizeClientUserAgent,
} from "./request-client";

const CURRENCY_RE = /^[A-Z]{3}$/;
const META_HASH_RE = /^[a-f0-9]{64}$/;

/** Meta _fbp: fb.{version}.{timestamp}.{browser_id} */
const FBP_VERSION_RE = /^[1-9]\d{0,2}$/;
const FBP_ID_RE = /^[A-Za-z0-9]{1,64}$/;

/** Meta _fbc: fb.{version}.{timestamp}.{fbclid} */
const FBC_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

const TS_MIN_SEC = 1_262_304_000; // 2010-01-01
const TS_MAX_SEC = 2_051_222_400; // 2035-01-01
const TS_MIN_MS = TS_MIN_SEC * 1000;
const TS_MAX_MS = TS_MAX_SEC * 1000;

function isPlausibleMetaTimestamp(ts: string): boolean {
  if (!/^\d{10,13}$/.test(ts)) return false;
  const n = Number(ts);
  if (!Number.isFinite(n)) return false;
  if (ts.length === 10) return n >= TS_MIN_SEC && n <= TS_MAX_SEC;
  if (ts.length === 13) return n >= TS_MIN_MS && n <= TS_MAX_MS;
  // 11–12 digit values: accept if within second-range bounds.
  return n >= TS_MIN_SEC && n <= TS_MAX_SEC;
}

function parseMetaCookieToken(
  value: string,
  idRe: RegExp,
): { version: string; timestamp: string; id: string } | null {
  if (!value.startsWith("fb.")) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const version = parts[1];
  const timestamp = parts[2];
  const id = parts[3];
  if (!FBP_VERSION_RE.test(version)) return null;
  if (!isPlausibleMetaTimestamp(timestamp)) return null;
  if (!idRe.test(id)) return null;
  return { version, timestamp, id };
}

export function sanitizeFbp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 128);
  const parsed = parseMetaCookieToken(trimmed, FBP_ID_RE);
  return parsed ? trimmed : null;
}

export function sanitizeFbc(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 256);
  const parsed = parseMetaCookieToken(trimmed, FBC_ID_RE);
  return parsed ? trimmed : null;
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

function sanitizeMetaHash(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim().toLowerCase();
  return META_HASH_RE.test(trimmed) ? trimmed : null;
}

function sanitizeUserData(
  userData: MetaCapiUserData | undefined,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};

  const emHash =
    sanitizeMetaHash(userData?.emHash) ??
    (userData?.email ? hashMetaEmail(userData.email) : null);
  if (emHash) out.em = [emHash];

  const externalHash =
    sanitizeMetaHash(userData?.externalIdHash) ??
    (userData?.userId ? hashMetaExternalId(userData.userId) : null);
  if (externalHash) out.external_id = [externalHash];

  const fbp = sanitizeFbp(userData?.fbp);
  const fbc = sanitizeFbc(userData?.fbc);
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;

  const ip = sanitizeClientIp(userData?.clientIpAddress);
  if (ip) out.client_ip_address = ip;

  const ua = sanitizeClientUserAgent(userData?.clientUserAgent);
  if (ua) out.client_user_agent = ua;

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
