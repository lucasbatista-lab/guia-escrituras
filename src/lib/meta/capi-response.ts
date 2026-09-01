import { logger } from "@/lib/logging/logger";
import type { MetaCapiEventName, MetaCapiSendResult } from "./capi-types";

const ERROR_MESSAGE_MAX = 120;
const EMAIL_LIKE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN_LIKE = /\b(?:EAA[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+)\b/g;

export type CapiLogOutcome = MetaCapiSendResult["status"];

export type TestEventCodeLogMeta = {
  test_code_present: boolean;
  test_code_prefix_valid?: boolean;
  test_code_length?: number;
  test_code_suffix?: string;
};

export function describeTestEventCode(
  code: string | null | undefined,
): TestEventCodeLogMeta {
  if (!code) {
    return { test_code_present: false };
  }
  return {
    test_code_present: true,
    test_code_prefix_valid: code.startsWith("TEST"),
    test_code_length: code.length,
    test_code_suffix: code.slice(-4),
  };
}

export function pixelIdSuffix(pixelId: string | null | undefined): string | undefined {
  const id = pixelId?.trim() || "";
  if (!id) return undefined;
  return id.slice(-4);
}

export function sanitizeCapiMessage(value: string): string {
  return value
    .replace(EMAIL_LIKE, "[redacted]")
    .replace(TOKEN_LIKE, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ERROR_MESSAGE_MAX);
}

export function parseJsonObject(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; reason: "empty" | "invalid_json" } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, reason: "invalid_json" };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

export function extractEventsReceived(
  body: Record<string, unknown>,
): number | null {
  const raw = body.events_received;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function extractFbtraceId(
  body: Record<string, unknown>,
): string | undefined {
  if (typeof body.fbtrace_id === "string" && body.fbtrace_id.trim()) {
    return body.fbtrace_id.trim().slice(0, 64);
  }
  const error = asRecord(body.error);
  if (error && typeof error.fbtrace_id === "string" && error.fbtrace_id.trim()) {
    return error.fbtrace_id.trim().slice(0, 64);
  }
  return undefined;
}

export function extractSafeMessages(
  body: Record<string, unknown>,
): { messages_count?: number; messages?: string[] } {
  if (!("messages" in body)) return {};
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return { messages_count: 0 };
  }
  const safe = messages
    .filter((item): item is string => typeof item === "string")
    .map(sanitizeCapiMessage)
    .filter(Boolean)
    .slice(0, 3);
  return {
    messages_count: messages.length,
    ...(safe.length > 0 ? { messages: safe } : {}),
  };
}

export type SafeGraphError = {
  httpStatus: number;
  errorType?: string;
  errorCode?: number;
  errorSubcode?: number;
  message?: string;
  fbtraceId?: string;
};

export function extractSafeGraphError(
  httpStatus: number,
  body: Record<string, unknown> | null,
): SafeGraphError {
  const error = body ? asRecord(body.error) : null;
  const fbtraceId = body ? extractFbtraceId(body) : undefined;
  const code =
    error && typeof error.code === "number" && Number.isFinite(error.code)
      ? error.code
      : undefined;
  const subcode =
    error &&
    typeof error.error_subcode === "number" &&
    Number.isFinite(error.error_subcode)
      ? error.error_subcode
      : undefined;
  const type =
    error && typeof error.type === "string" ? error.type.slice(0, 64) : undefined;
  const message =
    error && typeof error.message === "string"
      ? sanitizeCapiMessage(error.message)
      : undefined;

  return {
    httpStatus,
    errorType: type,
    errorCode: code,
    errorSubcode: subcode,
    message,
    fbtraceId,
  };
}

const LOG_NAME: Record<CapiLogOutcome, string> = {
  sent: "meta_capi_sent",
  skipped: "meta_capi_skipped",
  disabled: "meta_capi_disabled",
  rejected: "meta_capi_rejected",
  failed: "meta_capi_failed",
};

export type CapiAttemptLogInput = {
  outcome: CapiLogOutcome;
  eventName: MetaCapiEventName;
  eventId?: string;
  reason?: string;
  code?: string;
  httpStatus?: number;
  eventsReceived?: number;
  fbtraceId?: string;
  messagesCount?: number;
  messages?: string[];
  graphVersion?: string;
  pixelId?: string;
  testEventCode?: string | null;
  errorType?: string;
  errorCode?: number;
  errorSubcode?: number;
  errorMessage?: string;
};

/** Structured, PII-safe CAPI attempt log. One call per attempt. */
export function logMetaCapiAttempt(input: CapiAttemptLogInput): void {
  const fields: Record<string, unknown> = {
    event_name: input.eventName,
    outcome: input.outcome,
  };
  if (input.eventId) fields.event_id = input.eventId.slice(0, 64);
  if (input.reason) fields.reason = input.reason;
  if (input.code) fields.code = input.code;

  const suffix = pixelIdSuffix(input.pixelId);
  if (suffix) fields.pixel_id_suffix = suffix;
  if (input.graphVersion) fields.graph_version = input.graphVersion;

  Object.assign(fields, describeTestEventCode(input.testEventCode));

  if (typeof input.httpStatus === "number") {
    fields.http_status = input.httpStatus;
  }
  if (typeof input.eventsReceived === "number") {
    fields.events_received = input.eventsReceived;
  }
  if (input.fbtraceId) fields.fbtrace_id = input.fbtraceId.slice(0, 64);
  if (typeof input.messagesCount === "number") {
    fields.messages_count = input.messagesCount;
  }
  if (input.messages && input.messages.length > 0) {
    fields.messages = input.messages;
  }
  if (input.errorType) fields.error_type = input.errorType;
  if (typeof input.errorCode === "number") fields.error_code = input.errorCode;
  if (typeof input.errorSubcode === "number") {
    fields.error_subcode = input.errorSubcode;
  }
  if (input.errorMessage) fields.error_message = input.errorMessage;

  logger.info(LOG_NAME[input.outcome], fields);
}

export function logMetaCapiResult(
  result: MetaCapiSendResult,
  extras?: {
    graphVersion?: string;
    pixelId?: string;
    testEventCode?: string | null;
    messagesCount?: number;
    messages?: string[];
    errorType?: string;
    errorCode?: number;
    errorSubcode?: number;
    errorMessage?: string;
  },
): void {
  logMetaCapiAttempt({
    outcome: result.status,
    eventName: result.eventName,
    eventId: "eventId" in result ? result.eventId : undefined,
    reason: "reason" in result ? result.reason : undefined,
    code: "code" in result ? result.code : undefined,
    httpStatus: "httpStatus" in result ? result.httpStatus : undefined,
    eventsReceived:
      result.status === "sent" ? result.eventsReceived : undefined,
    fbtraceId: "fbtraceId" in result ? result.fbtraceId : undefined,
    ...extras,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
