/**
 * Typed Meta Graph send outcomes — no raw Meta bodies stored.
 */

export type MetaGraphErrorCode =
  | "meta_rate_limited"
  | "meta_server_error"
  | "meta_auth_rejected"
  | "meta_invalid_request"
  | "meta_invalid_response"
  | "meta_timeout_ambiguous"
  | "meta_network_error"
  | "meta_configuration_error"
  | "meta_delivery_failed";

export type MetaGraphSendResult =
  | {
      kind: "SUCCESS";
      providerMessageId: string;
      latencyMs: number;
    }
  | {
      kind: "TRANSIENT_FAILURE";
      errorCode: MetaGraphErrorCode;
      retryAfterSeconds: number | null;
      latencyMs: number;
      abortBatch?: boolean;
    }
  | {
      kind: "PERMANENT_FAILURE";
      errorCode: MetaGraphErrorCode;
      latencyMs: number;
      abortBatch?: boolean;
    }
  | {
      kind: "AMBIGUOUS_DELIVERY";
      errorCode: MetaGraphErrorCode;
      latencyMs: number;
    };

export function computeOutboundBackoffSeconds(
  attemptCount: number,
  retryAfterSeconds: number | null,
  maxSeconds = 300,
): number {
  if (
    retryAfterSeconds != null &&
    Number.isFinite(retryAfterSeconds) &&
    retryAfterSeconds > 0
  ) {
    return Math.min(maxSeconds, Math.floor(retryAfterSeconds));
  }
  const capped = Math.min(Math.max(attemptCount, 1), 8);
  return Math.min(maxSeconds, 5 * 2 ** (capped - 1));
}

export function parseRetryAfterSeconds(
  header: string | null | undefined,
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    if (Number.isFinite(n) && n >= 0) return Math.min(3600, n);
    return null;
  }
  const when = Date.parse(trimmed);
  if (!Number.isFinite(when)) return null;
  const delta = Math.ceil((when - Date.now()) / 1000);
  if (delta <= 0) return 1;
  return Math.min(3600, delta);
}
