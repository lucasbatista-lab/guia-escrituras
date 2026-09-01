import "server-only";

import { resolveMetaCapiConfig } from "./capi-config";
import { buildCapiEventPayload } from "./capi-sanitize";
import {
  extractEventsReceived,
  extractFbtraceId,
  extractSafeGraphError,
  extractSafeMessages,
  logMetaCapiAttempt,
  parseJsonObject,
} from "./capi-response";
import type { MetaCapiEventInput, MetaCapiSendResult } from "./capi-types";

const CAPI_TIMEOUT_MS = 2500;

/**
 * Privacy-safe Meta Conversions API client.
 * Failures never throw to commercial callers.
 */
export async function sendMetaCapiEvent(
  input: MetaCapiEventInput,
): Promise<MetaCapiSendResult> {
  const config = resolveMetaCapiConfig();
  if (!config.enabled) {
    const result: MetaCapiSendResult = {
      status: "disabled",
      reason: config.reason,
      eventName: input.eventName,
      eventId: input.eventId,
    };
    logMetaCapiAttempt({
      outcome: "disabled",
      eventName: input.eventName,
      eventId: input.eventId,
      reason: config.reason,
    });
    return result;
  }

  const observability = {
    graphVersion: config.graphVersion,
    pixelId: config.pixelId,
    testEventCode: config.testEventCode,
  };

  const eventPayload = buildCapiEventPayload(input);
  if (!eventPayload) {
    const result: MetaCapiSendResult = {
      status: "rejected",
      eventName: input.eventName,
      eventId: input.eventId,
      reason: "payload_rejected",
      code: "payload_rejected",
    };
    logMetaCapiAttempt({
      outcome: "rejected",
      eventName: input.eventName,
      eventId: input.eventId,
      reason: "payload_rejected",
      code: "payload_rejected",
      ...observability,
    });
    return result;
  }

  const body: Record<string, unknown> = {
    data: [eventPayload],
  };
  if (config.testEventCode) {
    body.test_event_code = config.testEventCode;
  }

  const endpoint = `https://graph.facebook.com/${config.graphVersion}/${config.pixelId}/events`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPI_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        access_token: config.accessToken,
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    const parsed = parseJsonObject(raw);

    if (!response.ok) {
      const json = parsed.ok ? parsed.value : null;
      const graphError = extractSafeGraphError(response.status, json);
      const result: MetaCapiSendResult = {
        status: "rejected",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: `http_${response.status}`,
        code: `http_${response.status}`,
        httpStatus: response.status,
        fbtraceId: graphError.fbtraceId,
      };
      logMetaCapiAttempt({
        outcome: "rejected",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: result.reason,
        code: result.code,
        httpStatus: response.status,
        fbtraceId: graphError.fbtraceId,
        errorType: graphError.errorType,
        errorCode: graphError.errorCode,
        errorSubcode: graphError.errorSubcode,
        errorMessage: graphError.message,
        ...observability,
      });
      return result;
    }

    if (!parsed.ok) {
      const result: MetaCapiSendResult = {
        status: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: parsed.reason === "empty" ? "empty_body" : "invalid_json",
        code: parsed.reason === "empty" ? "empty_body" : "invalid_json",
        httpStatus: response.status,
      };
      logMetaCapiAttempt({
        outcome: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: result.reason,
        code: result.code,
        httpStatus: response.status,
        ...observability,
      });
      return result;
    }

    const eventsReceived = extractEventsReceived(parsed.value);
    const fbtraceId = extractFbtraceId(parsed.value);
    const messages = extractSafeMessages(parsed.value);

    if (eventsReceived === null) {
      const result: MetaCapiSendResult = {
        status: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: "events_received_missing",
        code: "events_received_missing",
        httpStatus: response.status,
        fbtraceId,
      };
      logMetaCapiAttempt({
        outcome: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: result.reason,
        code: result.code,
        httpStatus: response.status,
        fbtraceId,
        messagesCount: messages.messages_count,
        messages: messages.messages,
        ...observability,
      });
      return result;
    }

    if (eventsReceived < 1) {
      const result: MetaCapiSendResult = {
        status: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: "events_received_zero",
        code: "events_received_zero",
        httpStatus: response.status,
        fbtraceId,
      };
      logMetaCapiAttempt({
        outcome: "failed",
        eventName: input.eventName,
        eventId: input.eventId,
        reason: result.reason,
        code: result.code,
        httpStatus: response.status,
        eventsReceived,
        fbtraceId,
        messagesCount: messages.messages_count,
        messages: messages.messages,
        ...observability,
      });
      return result;
    }

    const result: MetaCapiSendResult = {
      status: "sent",
      eventName: input.eventName,
      eventId: input.eventId,
      httpStatus: response.status,
      eventsReceived,
      fbtraceId,
    };
    logMetaCapiAttempt({
      outcome: "sent",
      eventName: input.eventName,
      eventId: input.eventId,
      httpStatus: response.status,
      eventsReceived,
      fbtraceId,
      messagesCount: messages.messages_count,
      messages: messages.messages,
      ...observability,
    });
    return result;
  } catch (error) {
    const code =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_failed";
    const result: MetaCapiSendResult = {
      status: "failed",
      eventName: input.eventName,
      eventId: input.eventId,
      reason: code,
      code,
    };
    logMetaCapiAttempt({
      outcome: "failed",
      eventName: input.eventName,
      eventId: input.eventId,
      reason: code,
      code,
      ...observability,
    });
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export { resolveMetaCapiConfig } from "./capi-config";
export {
  buildCapiEventPayload,
  sanitizeEventId,
  sanitizeEventSourceUrl,
  sanitizeFbc,
  sanitizeFbp,
} from "./capi-sanitize";
export type {
  MetaCapiEventInput,
  MetaCapiEventName,
  MetaCapiSendResult,
} from "./capi-types";
export { META_CAPI_EVENTS, isMetaCapiEventName } from "./capi-types";
export {
  describeTestEventCode,
  pixelIdSuffix,
} from "./capi-response";
