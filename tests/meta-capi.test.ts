import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/lib/logging/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

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

  afterEach(() => {
    restoreEnv();
    fetchMock.mockReset();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("stays disabled without complete server configuration", async () => {
    snapshotEnv();
    delete process.env.META_ADS_ENABLED;
    delete process.env.META_GRAPH_API_VERSION;
    const { resolveMetaCapiConfig, sendMetaCapiEvent } = await import(
      "@/lib/meta/capi"
    );
    expect(resolveMetaCapiConfig()).toEqual({
      enabled: false,
      reason: "meta_ads_disabled",
    });

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

    const result = await again.sendMetaCapiEvent({
      eventName: "InitiateCheckout",
      eventId: "evt_1",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
      actionSource: "website",
    });
    expect(result.status).toBe("disabled");
    void sendMetaCapiEvent;
  });

  it("sends allowlisted payloads with optional test code and timeout safety", async () => {
    snapshotEnv();
    process.env.META_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
    process.env.META_CAPI_ACCESS_TOKEN = "server-token-only";
    process.env.META_GRAPH_API_VERSION = "v21.0";
    process.env.META_CAPI_TEST_EVENT_CODE = "TEST12345";

    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { sendMetaCapiEvent, buildCapiEventPayload } = await import(
      "@/lib/meta/capi"
    );

    const forbidden = buildCapiEventPayload({
      eventName: "Purchase",
      eventId: "bad id with spaces",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/x",
      actionSource: "website",
      customData: { value: 58, currency: "BRL" },
    } as never);
    expect(forbidden).toBeNull();

    const allowed = buildCapiEventPayload({
      eventName: "Purchase",
      eventId: "evt_purchase_1",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar?utm=drop",
      actionSource: "website",
      userData: {
        fbp: "fb.1.1700000000.123",
        fbc: "fb.1.1700000000.AbC",
      },
      customData: { value: 58, currency: "BRL" },
    });
    expect(allowed).toMatchObject({
      event_name: "Purchase",
      event_id: "evt_purchase_1",
      action_source: "website",
      event_source_url: "https://amemchat.com.br/assinar/continuar",
      custom_data: { value: 58, currency: "BRL" },
    });
    expect(JSON.stringify(allowed)).not.toMatch(/email|tradition|plan_key/i);

    const sent = await sendMetaCapiEvent({
      eventName: "InitiateCheckout",
      eventId: "evt_ic_1",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
      actionSource: "website",
      customData: { value: 58, currency: "BRL" },
    });
    expect(sent.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("graph.facebook.com/v21.0/1234567890/events");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.test_event_code).toBe("TEST12345");
    expect(body.access_token).toBe("server-token-only");
    expect(JSON.stringify(body)).not.toMatch(/@|evangel|catolic|conversa/i);
  });

  it("never throws when Meta fails", async () => {
    snapshotEnv();
    process.env.META_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
    process.env.META_CAPI_ACCESS_TOKEN = "server-token-only";
    process.env.META_GRAPH_API_VERSION = "v21.0";

    fetchMock.mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const { sendMetaCapiEvent } = await import("@/lib/meta/capi");
    const result = await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: "evt_fail",
      eventTime: 1_700_000_000,
      eventSourceUrl: "https://amemchat.com.br/x",
      actionSource: "website",
      customData: { value: 38, currency: "BRL" },
    });
    expect(result.status).toBe("failed");
  });
});
