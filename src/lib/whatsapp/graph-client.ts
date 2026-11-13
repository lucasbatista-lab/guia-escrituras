import "server-only";

import {
  WHATSAPP_GRAPH_API_BASE_URL,
  WHATSAPP_OUTBOUND_TEXT_MAX,
  WHATSAPP_OUTBOUND_TIMEOUT_MS,
  resolveWhatsAppOutboundConfig,
} from "@/lib/whatsapp/config";
import {
  parseRetryAfterSeconds,
  type MetaGraphSendResult,
} from "@/lib/whatsapp/graph-results";

export type GraphHttpTransport = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export type MetaWhatsAppGraphClientOptions = {
  accessToken?: string;
  phoneNumberId?: string;
  graphApiVersion?: string;
  /** Injected for tests — never from HTTP/env public. */
  transport?: GraphHttpTransport;
  /** Override base URL only for tests. */
  baseUrl?: string;
  timeoutMs?: number;
};

export type SendTextInput = {
  to: string;
  body: string;
  /** Correlation for caller — not sent to Meta as custom field. */
  idempotencyKey: string;
};

function extractProviderMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const messages = root.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const first = messages[0];
  if (!first || typeof first !== "object") return null;
  const id = (first as Record<string, unknown>).id;
  return typeof id === "string" && id.trim().length >= 3 ? id.trim() : null;
}

function isRecipientValid(to: string): boolean {
  // WhatsApp Cloud API expects digits (wa_id). No spaces/+ for MVP.
  return /^\d{8,20}$/.test(to.trim());
}

/**
 * Server-side Meta WhatsApp Cloud API text sender.
 * Never logs token, body, or destination.
 */
export class MetaWhatsAppGraphClient {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly graphApiVersion: string;
  private readonly transport: GraphHttpTransport;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: MetaWhatsAppGraphClientOptions = {}) {
    const resolved = resolveWhatsAppOutboundConfig();
    const accessToken = options.accessToken ?? (resolved.ok ? resolved.accessToken : null);
    const phoneNumberId =
      options.phoneNumberId ?? (resolved.ok ? resolved.phoneNumberId : null);
    const graphApiVersion =
      options.graphApiVersion ?? (resolved.ok ? resolved.graphApiVersion : null);

    if (!accessToken || !phoneNumberId || !graphApiVersion) {
      throw new Error("meta_configuration_error");
    }

    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.graphApiVersion = graphApiVersion;
    this.transport = options.transport ?? fetch;
    this.baseUrl = options.baseUrl ?? WHATSAPP_GRAPH_API_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? WHATSAPP_OUTBOUND_TIMEOUT_MS;
  }

  buildMessagesUrl(): string {
    return `${this.baseUrl}/${this.graphApiVersion}/${this.phoneNumberId}/messages`;
  }

  buildTextPayload(input: { to: string; body: string }): Record<string, unknown> {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to.trim(),
      type: "text",
      text: {
        preview_url: false,
        body: input.body.slice(0, WHATSAPP_OUTBOUND_TEXT_MAX),
      },
    };
  }

  async sendText(input: SendTextInput): Promise<MetaGraphSendResult> {
    const started = Date.now();
    const to = input.to.trim();
    const body = input.body.trim();

    if (!isRecipientValid(to) || !body) {
      return {
        kind: "PERMANENT_FAILURE",
        errorCode: "meta_invalid_request",
        latencyMs: Date.now() - started,
      };
    }

    const url = this.buildMessagesUrl();
    const payload = this.buildTextPayload({
      to,
      body: body.slice(0, WHATSAPP_OUTBOUND_TEXT_MAX),
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let requestStarted = false;
    try {
      requestStarted = true;
      const response = await this.transport(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - started;
      const retryAfter = parseRetryAfterSeconds(
        response.headers.get("retry-after"),
      );

      let parsed: unknown = null;
      let parseOk = true;
      try {
        const text = await response.text();
        if (text) {
          parsed = JSON.parse(text) as unknown;
        }
      } catch {
        parseOk = false;
      }

      if (response.status === 401 || response.status === 403) {
        return {
          kind: "PERMANENT_FAILURE",
          errorCode: "meta_auth_rejected",
          latencyMs,
          abortBatch: true,
        };
      }

      if (response.status === 429) {
        return {
          kind: "TRANSIENT_FAILURE",
          errorCode: "meta_rate_limited",
          retryAfterSeconds: retryAfter,
          latencyMs,
        };
      }

      if (response.status >= 500) {
        return {
          kind: "TRANSIENT_FAILURE",
          errorCode: "meta_server_error",
          retryAfterSeconds: retryAfter,
          latencyMs,
        };
      }

      if (response.status >= 400) {
        return {
          kind: "PERMANENT_FAILURE",
          errorCode: "meta_invalid_request",
          latencyMs,
        };
      }

      if (!response.ok) {
        return {
          kind: "TRANSIENT_FAILURE",
          errorCode: "meta_server_error",
          retryAfterSeconds: null,
          latencyMs,
        };
      }

      if (!parseOk) {
        // 2xx but unreadable — may have been accepted → ambiguous
        return {
          kind: "AMBIGUOUS_DELIVERY",
          errorCode: "meta_invalid_response",
          latencyMs,
        };
      }

      const providerMessageId = extractProviderMessageId(parsed);
      if (!providerMessageId) {
        return {
          kind: "AMBIGUOUS_DELIVERY",
          errorCode: "meta_invalid_response",
          latencyMs,
        };
      }

      return {
        kind: "SUCCESS",
        providerMessageId,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
      if (name === "AbortError" || controller.signal.aborted) {
        // Timeout after request may have left the process — ambiguous if started.
        return {
          kind: requestStarted ? "AMBIGUOUS_DELIVERY" : "TRANSIENT_FAILURE",
          errorCode: requestStarted
            ? "meta_timeout_ambiguous"
            : "meta_network_error",
          ...(requestStarted
            ? {}
            : { retryAfterSeconds: null as number | null }),
          latencyMs,
        } as MetaGraphSendResult;
      }
      // Generic network — if requestStarted, treat as ambiguous to avoid dupes.
      if (requestStarted) {
        return {
          kind: "AMBIGUOUS_DELIVERY",
          errorCode: "meta_network_error",
          latencyMs,
        };
      }
      return {
        kind: "TRANSIENT_FAILURE",
        errorCode: "meta_network_error",
        retryAfterSeconds: null,
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Test helper — never use in production routes. */
export function createTestMetaWhatsAppGraphClient(
  options: MetaWhatsAppGraphClientOptions & {
    accessToken: string;
    phoneNumberId: string;
    graphApiVersion: string;
  },
): MetaWhatsAppGraphClient {
  return new MetaWhatsAppGraphClient(options);
}
