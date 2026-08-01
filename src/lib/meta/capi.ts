import "server-only";

import { logger } from "@/lib/logging/logger";
import { resolveMetaCapiConfig } from "./capi-config";
import { buildCapiEventPayload } from "./capi-sanitize";
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
    return { status: "disabled", reason: config.reason };
  }

  const eventPayload = buildCapiEventPayload(input);
  if (!eventPayload) {
    logger.info("meta_capi_rejected", {
      event_name: input.eventName,
      event_id: input.eventId?.slice(0, 64),
      status: "rejected",
      code: "payload_rejected",
    });
    return {
      status: "rejected",
      eventName: input.eventName,
      eventId: input.eventId,
      code: "payload_rejected",
    };
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

    if (!response.ok) {
      const code = `http_${response.status}`;
      logger.info("meta_capi_rejected", {
        event_name: input.eventName,
        event_id: input.eventId.slice(0, 64),
        status: "rejected",
        code,
      });
      return {
        status: "rejected",
        eventName: input.eventName,
        eventId: input.eventId,
        code,
      };
    }

    logger.info("meta_capi_sent", {
      event_name: input.eventName,
      event_id: input.eventId.slice(0, 64),
      status: "sent",
      code: "ok",
    });
    return {
      status: "sent",
      eventName: input.eventName,
      eventId: input.eventId,
    };
  } catch (error) {
    const code =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_failed";
    logger.info("meta_capi_failed", {
      event_name: input.eventName,
      event_id: input.eventId.slice(0, 64),
      status: "failed",
      code,
    });
    return {
      status: "failed",
      eventName: input.eventName,
      eventId: input.eventId,
      code,
    };
  } finally {
    clearTimeout(timer);
  }
}

export {
  resolveMetaCapiConfig,
} from "./capi-config";
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
