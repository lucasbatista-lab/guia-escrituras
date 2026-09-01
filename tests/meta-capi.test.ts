import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import {
  describeTestEventCode,
  extractSafeGraphError,
  extractSafeMessages,
  parseJsonObject,
  pixelIdSuffix,
  sanitizeCapiMessage,
} from "@/lib/meta/capi-response";

const fetchMock = vi.fn();

vi.mock("@/lib/logging/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () =>
      typeof body === "string" ? body : JSON.stringify(body),
  };
}

const IC_INPUT = {
  eventName: "InitiateCheckout" as const,
  eventId: "evt_ic_1",
  eventTime: 1_700_000_000,
  eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
  actionSource: "website" as const,
  customData: { value: 58, currency: "BRL" },
};

describe("meta CAPI response helpers", () => {
  it("masks test event code metadata without printing the full value", () => {
    expect(describeTestEventCode("TEST56221")).toEqual({
      test_code_present: true,
      test_code_prefix_valid: true,
      test_code_length: 9,
      test_code_suffix: "6221",
    });
    expect(JSON.stringify(describeTestEventCode("TEST56221"))).not.toContain(
      "TEST56221",
    );
    expect(describeTestEventCode(null)).toEqual({ test_code_present: false });
    expect(describeTestEventCode("other")).toMatchObject({
      test_code_present: true,
      test_code_prefix_valid: false,
    });
  });

  it("exposes only the pixel id suffix", () => {
    expect(pixelIdSuffix("1366651005137269")).toBe("7269");
  });

  it("parses JSON objects and rejects invalid payloads", () => {
    expect(parseJsonObject('{"events_received":1}')).toEqual({
      ok: true,
      value: { events_received: 1 },
    });
    expect(parseJsonObject("")).toEqual({ ok: false, reason: "empty" });
    expect(parseJsonObject("{")).toEqual({ ok: false, reason: "invalid_json" });
    expect(parseJsonObject("[1]")).toEqual({ ok: false, reason: "invalid_json" });
  });

  it("sanitizes Graph messages and errors without PII", () => {
    expect(sanitizeCapiMessage("ok user@example.com EAA123456")).toBe(
      "ok [redacted] [redacted]",
    );
    const messages = extractSafeMessages({
      messages: ["Event received", "email victim@host.com leaked"],
    });
    expect(messages.messages_count).toBe(2);
    expect(messages.messages?.join(" ")).not.toMatch(/@/);
    const graphError = extractSafeGraphError(400, {
      error: {
        type: "OAuthException",
        code: 190,
        error_subcode: 463,
        message: "Invalid token for user@x.com",
        fbtrace_id: "ABC123",
      },
    });
    expect(graphError).toMatchObject({
      httpStatus: 400,
      errorType: "OAuthException",
      errorCode: 190,
      errorSubcode: 463,
      fbtraceId: "ABC123",
    });
    expect(graphError.message).not.toMatch(/@/);
  });
});

describe("meta conversions API client", () => {
  const envKeys = [
    "META_ADS_ENABLED",
    "NEXT_PUBLIC_META_PIXEL_ID",
    "META_CAPI_ACCESS_TOKEN",
    "META_CAPI_TEST_EVENT_CODE",
    "META_GRAPH_API_VERSION",
  ] as const;
  const previous = new Map<string, string | undefined>();

  function snapshotEnv() {
    for (const key of envKeys) previous.set(key, process.env[key]);
  }

  function restoreEnv() {
    for (const key of envKeys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  async function enableCapi(testCode = " TEST56221 ") {
    snapshotEnv();
    process.env.META_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1366651005137269";
    process.env.META_CAPI_ACCESS_TOKEN = "server-token-only";
    process.env.META_GRAPH_API_VERSION = "v26.0";
    process.env.META_CAPI_TEST_EVENT_CODE = testCode;
  }

  async function loadClient() {
    vi.stubGlobal("fetch", fetchMock);
    return import("@/lib/meta/capi");
  }

  async function loggerMock() {
    const { logger } = await import("@/lib/logging/logger");
    return logger as unknown as {
      info: Mock;
      warn: Mock;
      error: Mock;
    };
  }

  function loggedPayloads() {
    return fetchMock.mock.calls;
  }

  afterEach(() => {
    restoreEnv();
    fetchMock.mockReset();
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("stays disabled without complete server configuration and logs disabled", async () => {
    snapshotEnv();
    delete process.env.META_ADS_ENABLED;
    delete process.env.META_GRAPH_API_VERSION;
    const { resolveMetaCapiConfig, sendMetaCapiEvent } = await loadClient();
    expect(resolveMetaCapiConfig()).toEqual({
      enabled: false,
      reason: "meta_ads_disabled",
    });

    const result = await sendMetaCapiEvent(IC_INPUT);
    expect(result).toMatchObject({
      status: "disabled",
      reason: "meta_ads_disabled",
      eventName: "InitiateCheckout",
    });
    const logger = await loggerMock();
    expect(logger.info).toHaveBeenCalledWith(
      "meta_capi_disabled",
      expect.objectContaining({
        outcome: "disabled",
        reason: "meta_ads_disabled",
        event_name: "InitiateCheckout",
      }),
    );

    process.env.META_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
    process.env.META_CAPI_ACCESS_TOKEN = "token";
    delete process.env.META_GRAPH_API_VERSION;
    vi.resetModules();
    const again = await import("@/lib/meta/capi");
    expect(again.resolveMetaCapiConfig()).toEqual({
      enabled: false,
      reason: "graph_version_missing",
    });
  });

  it("sends allowlisted payloads with trimmed test code only after events_received >= 1", async () => {
    await enableCapi();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        events_received: 1,
        fbtrace_id: "TRACE123",
        messages: ["Event received"],
      }),
    );
    const { sendMetaCapiEvent, buildCapiEventPayload } = await loadClient();
    const logger = await loggerMock();

    const forbidden = buildCapiEventPayload({
      eventName: "Purchase",
      eventId: "bad id with spaces",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/x",
      actionSource: "website",
      customData: { value: 58, currency: "BRL" },
    } as never);
    expect(forbidden).toBeNull();

    const sent = await sendMetaCapiEvent(IC_INPUT);
    expect(sent).toMatchObject({
      status: "sent",
      eventsReceived: 1,
      httpStatus: 200,
      fbtraceId: "TRACE123",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://graph.facebook.com/v26.0/1366651005137269/events",
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.test_event_code).toBe("TEST56221");
    expect(body.access_token).toBe("server-token-only");
    expect(JSON.stringify(body)).not.toMatch(/@|evangel|catolic|conversa/i);

    expect(logger.info).toHaveBeenCalledWith(
      "meta_capi_sent",
      expect.objectContaining({
        outcome: "sent",
        event_name: "InitiateCheckout",
        event_id: "evt_ic_1",
        pixel_id_suffix: "7269",
        graph_version: "v26.0",
        test_code_present: true,
        test_code_prefix_valid: true,
        test_code_length: 9,
        test_code_suffix: "6221",
        http_status: 200,
        events_received: 1,
        fbtrace_id: "TRACE123",
      }),
    );
    const logArg = logger.info.mock.calls.find(
      (call) => call[0] === "meta_capi_sent",
    )?.[1] as Record<string, unknown>;
    expect(JSON.stringify(logArg)).not.toContain("TEST56221");
    expect(JSON.stringify(logArg)).not.toContain("server-token-only");
    expect(JSON.stringify(logArg)).not.toMatch(/email|_fbp|_fbc|user_agent/i);
  });

  it("does not mark sent when events_received is 0", async () => {
    await enableCapi();
    fetchMock.mockResolvedValue(jsonResponse(200, { events_received: 0 }));
    const { sendMetaCapiEvent } = await loadClient();
    const result = await sendMetaCapiEvent(IC_INPUT);
    expect(result.status).toBe("failed");
    expect(result).toMatchObject({ reason: "events_received_zero" });
    const logger = await loggerMock();
    expect(logger.info).toHaveBeenCalledWith(
      "meta_capi_failed",
      expect.objectContaining({ outcome: "failed", events_received: 0 }),
    );
    expect(logger.info).not.toHaveBeenCalledWith(
      "meta_capi_sent",
      expect.anything(),
    );
  });

  it("does not mark sent when events_received is missing", async () => {
    await enableCapi();
    fetchMock.mockResolvedValue(jsonResponse(200, { fbtrace_id: "X" }));
    const { sendMetaCapiEvent } = await loadClient();
    const result = await sendMetaCapiEvent(IC_INPUT);
    expect(result).toMatchObject({
      status: "failed",
      reason: "events_received_missing",
      fbtraceId: "X",
    });
  });

  it("does not mark sent when HTTP 200 body is invalid JSON", async () => {
    await enableCapi();
    fetchMock.mockResolvedValue(jsonResponse(200, "{not-json"));
    const { sendMetaCapiEvent } = await loadClient();
    const result = await sendMetaCapiEvent(IC_INPUT);
    expect(result).toMatchObject({ status: "failed", reason: "invalid_json" });
  });

  it.each([400, 401, 403, 429, 500])(
    "rejects HTTP %s without throwing",
    async (status) => {
      await enableCapi();
      fetchMock.mockResolvedValue(
        jsonResponse(status, {
          error: {
            type: "OAuthException",
            code: 1,
            error_subcode: 2,
            message: "denied user@x.com",
            fbtrace_id: "ERRTRACE",
          },
        }),
      );
      const { sendMetaCapiEvent } = await loadClient();
      const result = await sendMetaCapiEvent(IC_INPUT);
      expect(result).toMatchObject({
        status: "rejected",
        reason: `http_${status}`,
        httpStatus: status,
        fbtraceId: "ERRTRACE",
      });
      const logger = await loggerMock();
      expect(logger.info).toHaveBeenCalledWith(
        "meta_capi_rejected",
        expect.objectContaining({
          http_status: status,
          fbtrace_id: "ERRTRACE",
          error_type: "OAuthException",
        }),
      );
      const rejected = logger.info.mock.calls.find(
        (call) => call[0] === "meta_capi_rejected",
      )?.[1] as Record<string, unknown>;
      expect(JSON.stringify(rejected)).not.toMatch(/user@x\.com/);
    },
  );

  it("never throws on timeout or network failure", async () => {
    await enableCapi();
    const timeout = new Error("aborted");
    timeout.name = "AbortError";
    fetchMock.mockRejectedValueOnce(timeout);
    const { sendMetaCapiEvent } = await loadClient();
    await expect(sendMetaCapiEvent(IC_INPUT)).resolves.toMatchObject({
      status: "failed",
      reason: "timeout",
    });

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    vi.resetModules();
    const again = await import("@/lib/meta/capi");
    await expect(again.sendMetaCapiEvent(IC_INPUT)).resolves.toMatchObject({
      status: "failed",
      reason: "network_failed",
    });
  });

  it("skips InitiateCheckout without consent and does not call Graph", async () => {
    await enableCapi();
    vi.stubGlobal("fetch", fetchMock);
    const { emitInitiateCheckoutSafe } = await import(
      "@/lib/meta/emit-checkout-conversions"
    );
    const logger = await loggerMock();
    await emitInitiateCheckoutSafe(
      { id: "cs_test_1", currency: "brl", amount_total: 5800 } as never,
      {
        advertisingConsent: false,
        eventSourceUrl: null,
        fbp: null,
        fbc: null,
        eventId: null,
      },
      { userId: "user-1", email: "buyer@example.com", clientIp: null, clientUa: null },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "meta_capi_skipped",
      expect.objectContaining({
        outcome: "skipped",
        reason: "consent_not_granted",
        event_name: "InitiateCheckout",
      }),
    );
    const skipLog = JSON.stringify(
      logger.info.mock.calls.find((call) => call[0] === "meta_capi_skipped"),
    );
    expect(skipLog).not.toContain("buyer@example.com");
  });

  it("skips when ads context is missing", async () => {
    await enableCapi();
    vi.stubGlobal("fetch", fetchMock);
    const { emitInitiateCheckoutSafe } = await import(
      "@/lib/meta/emit-checkout-conversions"
    );
    const logger = await loggerMock();
    await emitInitiateCheckoutSafe(
      { id: "cs_test_2" } as never,
      null,
      { userId: "user-1", email: null, clientIp: null, clientUa: null },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "meta_capi_skipped",
      expect.objectContaining({ reason: "consent_not_granted" }),
    );
  });

  it("Meta failure after consent does not throw from emit wrapper", async () => {
    await enableCapi();
    fetchMock.mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const { emitInitiateCheckoutSafe } = await import(
      "@/lib/meta/emit-checkout-conversions"
    );
    await expect(
      emitInitiateCheckoutSafe(
        { id: "cs_test_3", currency: "brl", amount_total: 5800 } as never,
        {
          advertisingConsent: true,
          eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
          fbp: null,
          fbc: null,
          eventId: "evt_safe",
        },
        { userId: "user-1", email: null, clientIp: null, clientUa: null },
      ),
    ).resolves.toBeUndefined();
  });

  void loggedPayloads;
});
