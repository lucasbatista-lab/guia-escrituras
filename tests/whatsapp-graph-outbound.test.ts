import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWhatsAppAccessToken,
  getWhatsAppGraphApiVersion,
  getWhatsAppOutboundWorkerSecret,
  getWhatsAppPhoneNumberId,
  isWhatsAppChannelEnabled,
  isWhatsAppOutboundEnabled,
  isWhatsAppOutboundSendAllowed,
  resolveWhatsAppOutboundConfig,
  WHATSAPP_GRAPH_API_BASE_URL,
  WHATSAPP_OUTBOUND_TEXT_MAX,
} from "@/lib/whatsapp/config";
import {
  createTestMetaWhatsAppGraphClient,
  type GraphHttpTransport,
} from "@/lib/whatsapp/graph-client";
import {
  computeOutboundBackoffSeconds,
  parseRetryAfterSeconds,
} from "@/lib/whatsapp/graph-results";
import {
  normalizeWhatsAppDeliveryStatuses,
} from "@/lib/whatsapp/delivery-status";
import { MemoryOutboundClaimStore } from "@/lib/whatsapp/outbound-claim";
import { processPendingWhatsAppOutbound } from "@/lib/whatsapp/process-outbound";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp/normalize";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

const TOKEN = "EAAG_test_token_value_at_least_20";
const PHONE_ID = "123456789012345";
const VERSION = "v21.0";

function okTransport(providerId = "wamid.TEST123"): GraphHttpTransport {
  return async () =>
    new Response(JSON.stringify({ messages: [{ id: providerId }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}

describe("whatsapp outbound config flags", () => {
  it("outbound flag absent/false/invalid → false", () => {
    expect(isWhatsAppOutboundEnabled({})).toBe(false);
    expect(isWhatsAppOutboundEnabled({ WHATSAPP_OUTBOUND_ENABLED: "false" })).toBe(false);
    expect(isWhatsAppOutboundEnabled({ WHATSAPP_OUTBOUND_ENABLED: "maybe" })).toBe(false);
  });

  it("outbound flag true only when explicit", () => {
    expect(isWhatsAppOutboundEnabled({ WHATSAPP_OUTBOUND_ENABLED: "true" })).toBe(true);
  });

  it("channel false blocks send even if outbound true", () => {
    expect(
      isWhatsAppOutboundSendAllowed({
        WHATSAPP_CHANNEL_ENABLED: "false",
        WHATSAPP_OUTBOUND_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it("both flags required for send", () => {
    expect(
      isWhatsAppOutboundSendAllowed({
        WHATSAPP_CHANNEL_ENABLED: "true",
        WHATSAPP_OUTBOUND_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      isWhatsAppOutboundSendAllowed({
        WHATSAPP_CHANNEL_ENABLED: "true",
        WHATSAPP_OUTBOUND_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("credentials alone never enable", () => {
    expect(
      isWhatsAppOutboundSendAllowed({
        WHATSAPP_ACCESS_TOKEN: TOKEN,
        WHATSAPP_PHONE_NUMBER_ID: PHONE_ID,
        WHATSAPP_GRAPH_API_VERSION: VERSION,
      }),
    ).toBe(false);
  });

  it("version/token/phone validation fail closed", () => {
    expect(getWhatsAppGraphApiVersion({})).toBeNull();
    expect(getWhatsAppGraphApiVersion({ WHATSAPP_GRAPH_API_VERSION: "21.0" })).toBeNull();
    expect(
      getWhatsAppGraphApiVersion({
        WHATSAPP_GRAPH_API_VERSION: "https://graph.facebook.com/v21.0",
      }),
    ).toBeNull();
    expect(getWhatsAppGraphApiVersion({ WHATSAPP_GRAPH_API_VERSION: VERSION })).toBe(VERSION);
    expect(getWhatsAppAccessToken({})).toBeNull();
    expect(getWhatsAppAccessToken({ WHATSAPP_ACCESS_TOKEN: "short" })).toBeNull();
    expect(getWhatsAppPhoneNumberId({})).toBeNull();
    expect(getWhatsAppPhoneNumberId({ WHATSAPP_PHONE_NUMBER_ID: "+5511999" })).toBeNull();
    expect(getWhatsAppPhoneNumberId({ WHATSAPP_PHONE_NUMBER_ID: PHONE_ID })).toBe(PHONE_ID);
  });

  it("worker secret short fails closed", () => {
    expect(getWhatsAppOutboundWorkerSecret({})).toBeNull();
    expect(
      getWhatsAppOutboundWorkerSecret({ WHATSAPP_OUTBOUND_WORKER_SECRET: "short" }),
    ).toBeNull();
  });

  it("config resolve fails without secrets and never embeds them in code path", () => {
    expect(resolveWhatsAppOutboundConfig({}).ok).toBe(false);
    const src = read("src/lib/whatsapp/config.ts");
    expect(src).not.toMatch(/EAAG|Bearer /);
  });
});

describe("whatsapp Meta Graph client", () => {
  it("builds correct URL/method/payload with preview_url false", async () => {
    let seenUrl = "";
    const seen: { init: RequestInit | null } = { init: null };
    const transport: GraphHttpTransport = async (url, init) => {
      seenUrl = url;
      seen.init = init;
      return new Response(JSON.stringify({ messages: [{ id: "wamid.OK" }] }), {
        status: 200,
      });
    };
    const client = createTestMetaWhatsAppGraphClient({
      accessToken: TOKEN,
      phoneNumberId: PHONE_ID,
      graphApiVersion: VERSION,
      transport,
    });
    expect(client.buildMessagesUrl()).toBe(
      `${WHATSAPP_GRAPH_API_BASE_URL}/${VERSION}/${PHONE_ID}/messages`,
    );
    const result = await client.sendText({
      to: "5511999999999",
      body: "Olá",
      idempotencyKey: "k1",
    });
    expect(result.kind).toBe("SUCCESS");
    expect(seenUrl).toContain(`/messages`);
    expect(seen.init?.method).toBe("POST");
    expect(
      String(
        seen.init?.headers &&
          (seen.init.headers as Record<string, string>).Authorization,
      ),
    ).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(String(seen.init?.body)) as {
      text: { preview_url: boolean; body: string };
      to: string;
      type: string;
    };
    expect(body.type).toBe("text");
    expect(body.text.preview_url).toBe(false);
    expect(body.to).toBe("5511999999999");
    expect(body.text.body).toBe("Olá");
  });

  it("clamps body and rejects invalid destination permanently", async () => {
    const client = createTestMetaWhatsAppGraphClient({
      accessToken: TOKEN,
      phoneNumberId: PHONE_ID,
      graphApiVersion: VERSION,
      transport: okTransport(),
    });
    const long = "x".repeat(5000);
    const payload = client.buildTextPayload({ to: "5511999999999", body: long });
    expect(String((payload.text as { body: string }).body).length).toBeLessThanOrEqual(
      WHATSAPP_OUTBOUND_TEXT_MAX,
    );
    const bad = await client.sendText({
      to: "not-a-wa-id",
      body: "hi",
      idempotencyKey: "k",
    });
    expect(bad.kind).toBe("PERMANENT_FAILURE");
  });

  it("2xx without provider id → ambiguous", async () => {
    const client = createTestMetaWhatsAppGraphClient({
      accessToken: TOKEN,
      phoneNumberId: PHONE_ID,
      graphApiVersion: VERSION,
      transport: async () =>
        new Response(JSON.stringify({ messages: [{}] }), { status: 200 }),
    });
    const r = await client.sendText({
      to: "5511999999999",
      body: "hi",
      idempotencyKey: "k",
    });
    expect(r.kind).toBe("AMBIGUOUS_DELIVERY");
  });

  it("malformed JSON 2xx → ambiguous", async () => {
    const client = createTestMetaWhatsAppGraphClient({
      accessToken: TOKEN,
      phoneNumberId: PHONE_ID,
      graphApiVersion: VERSION,
      transport: async () => new Response("not-json", { status: 200 }),
    });
    const r = await client.sendText({
      to: "5511999999999",
      body: "hi",
      idempotencyKey: "k",
    });
    expect(r.kind).toBe("AMBIGUOUS_DELIVERY");
  });

  it("classifies 400/401/403/429/500", async () => {
    const cases: Array<{
      status: number;
      kind: string;
      abort?: boolean;
    }> = [
      { status: 400, kind: "PERMANENT_FAILURE" },
      { status: 401, kind: "PERMANENT_FAILURE", abort: true },
      { status: 403, kind: "PERMANENT_FAILURE", abort: true },
      { status: 429, kind: "TRANSIENT_FAILURE" },
      { status: 500, kind: "TRANSIENT_FAILURE" },
    ];
    for (const c of cases) {
      const client = createTestMetaWhatsAppGraphClient({
        accessToken: TOKEN,
        phoneNumberId: PHONE_ID,
        graphApiVersion: VERSION,
        transport: async () =>
          new Response("{}", {
            status: c.status,
            headers: c.status === 429 ? { "Retry-After": "12" } : {},
          }),
      });
      const r = await client.sendText({
        to: "5511999999999",
        body: "hi",
        idempotencyKey: "k",
      });
      expect(r.kind).toBe(c.kind);
      if (c.abort) {
        expect(
          r.kind === "PERMANENT_FAILURE" && r.abortBatch,
        ).toBe(true);
      }
      if (c.status === 429 && r.kind === "TRANSIENT_FAILURE") {
        expect(r.retryAfterSeconds).toBe(12);
      }
    }
  });

  it("timeout → ambiguous; parseRetryAfter and backoff work", async () => {
    expect(parseRetryAfterSeconds("30")).toBe(30);
    expect(computeOutboundBackoffSeconds(1, null)).toBe(5);
    expect(computeOutboundBackoffSeconds(2, 40)).toBe(40);

    const client = createTestMetaWhatsAppGraphClient({
      accessToken: TOKEN,
      phoneNumberId: PHONE_ID,
      graphApiVersion: VERSION,
      timeoutMs: 20,
      transport: async (_url, init) => {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, 200);
          init.signal?.addEventListener("abort", () => {
            clearTimeout(t);
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
        return new Response("{}", { status: 200 });
      },
    });
    const r = await client.sendText({
      to: "5511999999999",
      body: "hi",
      idempotencyKey: "k",
    });
    expect(r.kind).toBe("AMBIGUOUS_DELIVERY");
  });

  it("never logs body/token/destination in client source", () => {
    const src = read("src/lib/whatsapp/graph-client.ts");
    expect(src).not.toMatch(/logger\.|console\./);
    expect(src).toContain("Authorization");
  });
});

describe("whatsapp outbound claim", () => {
  it("claims only available pending/retry; lease protects; expired recovers", () => {
    const store = new MemoryOutboundClaimStore();
    const now = new Date("2026-11-12T12:00:00Z");
    store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "k1",
      availableAfter: now,
    });
    const first = store.claim({ now });
    expect(first.claimed).toBe(true);
    expect(store.claim({ now }).claimed).toBe(false);
    const later = new Date(now.getTime() + 91_000);
    expect(store.claim({ now: later }).claimed).toBe(true);
  });

  it("revoked identity and expired outbox are not claimed", () => {
    const store = new MemoryOutboundClaimStore();
    const now = new Date();
    store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "k1",
      identityActive: false,
    });
    store.insert({
      identityId: "id2",
      externalId: "5512",
      bodyText: "b",
      idempotencyKey: "k2",
      expiresAt: new Date(now.getTime() - 1000),
    });
    expect(store.claim({ now }).claimed).toBe(false);
    expect([...store.rows.values()].some((r) => r.status === "cancelled")).toBe(
      true,
    );
  });

  it("deterministic order and batch max", () => {
    const store = new MemoryOutboundClaimStore();
    const now = new Date();
    store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "ka",
      availableAfter: new Date(now.getTime() - 2000),
    });
    store.insert({
      identityId: "id2",
      externalId: "5512",
      bodyText: "b",
      idempotencyKey: "kb",
      availableAfter: new Date(now.getTime() - 1000),
    });
    const claimed = store.claim({ now, limit: 1 });
    expect(claimed.items).toHaveLength(1);
    expect(claimed.items[0]!.bodyText).toBe("a");
  });

  it("migration documents SKIP LOCKED and claim_token", () => {
    const sql = read(
      "supabase/migrations/20261112000021_whatsapp_outbound_delivery.sql",
    );
    expect(sql).toContain("for update of o skip locked");
    expect(sql).toContain("whatsapp_claim_outbound_messages");
    expect(sql).toContain("whatsapp_apply_delivery_status");
    expect(sql).toContain("delivery_unknown");
    expect(sql).toContain("claim_token");
  });
});

describe("whatsapp outbound worker", () => {
  it("flags off skip processing", async () => {
    const counts = await processPendingWhatsAppOutbound({ enabled: false });
    expect(counts.claimed).toBe(0);
  });

  it("success marks sent and persists provider id", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "oi",
      idempotencyKey: "k1",
    });
    const counts = await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => ({
        kind: "SUCCESS",
        providerMessageId: "wamid.ABC",
        latencyMs: 10,
      }),
    });
    expect(counts.sent).toBe(1);
    expect([...memory.rows.values()][0]!.status).toBe("sent");
    expect([...memory.rows.values()][0]!.providerMessageId).toBe("wamid.ABC");
  });

  it("retry keeps same row; permanent fails; ambiguous not resent", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => ({
        kind: "TRANSIENT_FAILURE",
        errorCode: "meta_server_error",
        retryAfterSeconds: 5,
        latencyMs: 1,
      }),
    });
    expect([...memory.rows.values()][0]!.status).toBe("retry");
    expect(memory.rows.size).toBe(1);

    const m2 = new MemoryOutboundClaimStore();
    m2.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k2",
    });
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory: m2,
      sendText: async () => ({
        kind: "PERMANENT_FAILURE",
        errorCode: "meta_invalid_request",
        latencyMs: 1,
      }),
    });
    expect([...m2.rows.values()][0]!.status).toBe("failed");

    const m3 = new MemoryOutboundClaimStore();
    m3.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k3",
    });
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory: m3,
      sendText: async () => ({
        kind: "AMBIGUOUS_DELIVERY",
        errorCode: "meta_timeout_ambiguous",
        latencyMs: 1,
      }),
    });
    expect([...m3.rows.values()][0]!.status).toBe("delivery_unknown");
    // delivery_unknown is not claimable
    expect(m3.claim({ now: new Date() }).claimed).toBe(false);
  });

  it("revoked between claim and send cancels without Graph", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    const sendText = vi.fn();
    const counts = await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      isIdentityActive: () => false,
      sendText: sendText as never,
    });
    expect(counts.cancelled).toBe(1);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("auth Meta aborts remaining batch", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    memory.insert({
      identityId: "id2",
      externalId: "5511888888888",
      bodyText: "b",
      idempotencyKey: "k2",
    });
    let calls = 0;
    const counts = await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => {
        calls += 1;
        return {
          kind: "PERMANENT_FAILURE",
          errorCode: "meta_auth_rejected",
          latencyMs: 1,
          abortBatch: true,
        };
      },
    });
    expect(calls).toBe(1);
    expect(counts.failed).toBe(2);
  });

  it("isolated item failure does not corrupt batch", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999999999",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    memory.insert({
      identityId: "id2",
      externalId: "5511888888888",
      bodyText: "b",
      idempotencyKey: "k2",
    });
    let n = 0;
    const counts = await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => {
        n += 1;
        if (n === 1) {
          return {
            kind: "PERMANENT_FAILURE",
            errorCode: "meta_invalid_request",
            latencyMs: 1,
          };
        }
        return {
          kind: "SUCCESS",
          providerMessageId: "wamid.OK2",
          latencyMs: 1,
        };
      },
    });
    expect(counts.failed).toBe(1);
    expect(counts.sent).toBe(1);
  });

  it("route contract: secret constant-time, POST only, no destination input", () => {
    const src = read("src/app/api/internal/whatsapp/send/route.ts");
    expect(src).toContain("timingSafeEqual");
    expect(src).toContain("getWhatsAppOutboundWorkerSecret");
    expect(src).toContain("isWhatsAppOutboundEnabled");
    expect(src).not.toContain("searchParams");
    expect(src).not.toMatch(/body\.(to|destination|external)/);
    expect(src).toContain("claimed:");
    expect(src).toContain("unknown:");
  });
});

describe("whatsapp delivery status webhook", () => {
  function statusPayload(
    statuses: Array<{ id: string; status: string; timestamp?: string }>,
  ) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                statuses: statuses.map((s) => ({
                  id: s.id,
                  status: s.status,
                  timestamp: s.timestamp ?? "1700000000",
                })),
              },
              field: "messages",
            },
          ],
        },
      ],
    };
  }

  it("normalizes sent/delivered/read/failed only", () => {
    const r = normalizeWhatsAppDeliveryStatuses(
      statusPayload([
        { id: "wamid.1", status: "sent" },
        { id: "wamid.2", status: "delivered" },
        { id: "wamid.3", status: "read" },
        { id: "wamid.4", status: "failed" },
        { id: "wamid.5", status: "deleted" },
      ]),
    );
    expect(r.kind).toBe("statuses");
    if (r.kind !== "statuses") return;
    expect(r.statuses).toHaveLength(4);
  });

  it("monotonic apply and no regress", () => {
    const store = new MemoryOutboundClaimStore();
    const row = store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    row.status = "sent";
    row.providerMessageId = "wamid.1";
    expect(store.applyStatus("wamid.1", "delivered").applied).toBe(true);
    expect(store.applyStatus("wamid.1", "sent").applied).toBe(false);
    expect(store.applyStatus("wamid.1", "read").applied).toBe(true);
    expect(store.applyStatus("wamid.1", "delivered").applied).toBe(false);
    expect(store.applyStatus("wamid.1", "failed").applied).toBe(false);
    expect(row.status).toBe("read");
  });

  it("unknown provider id ignored; duplicate idempotent", () => {
    const store = new MemoryOutboundClaimStore();
    expect(store.applyStatus("missing", "sent").applied).toBe(false);
    const row = store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    row.status = "delivered";
    row.providerMessageId = "wamid.x";
    expect(store.applyStatus("wamid.x", "delivered").applied).toBe(false);
  });

  it("status payloads do not create inbound text messages", () => {
    const inbound = normalizeWhatsAppWebhookPayload(
      statusPayload([{ id: "wamid.1", status: "delivered" }]),
    );
    expect(inbound.kind).toBe("ignored");
  });

  it("status path source never calls IA or debounce", () => {
    const src = read("src/lib/whatsapp/delivery-status.ts");
    expect(src).not.toContain("runChatTurn");
    expect(src).not.toContain("buildBundles");
    expect(src).not.toContain("processWhatsAppTextTurn");
  });

  it("channel-on outbound-off still allows status docs contract", () => {
    expect(isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "true" })).toBe(
      true,
    );
    expect(
      isWhatsAppOutboundEnabled({ WHATSAPP_OUTBOUND_ENABLED: "false" }),
    ).toBe(false);
    const receive = read("src/lib/whatsapp/receive.ts");
    expect(receive).toContain("normalizeWhatsAppDeliveryStatuses");
    expect(receive).toContain("applyNormalizedDeliveryStatuses");
  });
});

describe("whatsapp outbound idempotency contracts", () => {
  it("provider_message_id unique and stale claim cannot complete", () => {
    const store = new MemoryOutboundClaimStore();
    const a = store.insert({
      identityId: "id1",
      externalId: "5511",
      bodyText: "a",
      idempotencyKey: "k1",
    });
    const claimed = store.claim({ now: new Date() });
    expect(claimed.claimed).toBe(true);
    const token = claimed.claimToken!;
    expect(store.complete(a.id, token, "wamid.1")).toBe(true);
    expect(store.complete(a.id, token, "wamid.2")).toBe(false);
    expect(a.status).toBe("sent");
    // cancelled never returns to pending
    a.status = "cancelled";
    expect(store.claim({ now: new Date() }).claimed).toBe(false);
  });

  it("env example lists outbound secrets empty", () => {
    const env = read(".env.example");
    expect(env).toContain("WHATSAPP_OUTBOUND_ENABLED=false");
    expect(env).toContain("WHATSAPP_GRAPH_API_VERSION=");
    expect(env).toContain("WHATSAPP_OUTBOUND_WORKER_SECRET=");
  });

  it("repositories index untouched", () => {
    expect(read("src/lib/database/repositories/index.ts")).not.toMatch(
      /whatsapp/i,
    );
  });
});

describe("whatsapp outbound API runtime", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects non-POST and invalid secret", async () => {
    vi.doMock("@/lib/whatsapp/config", async () => {
      const actual = await vi.importActual<typeof import("@/lib/whatsapp/config")>(
        "@/lib/whatsapp/config",
      );
      return {
        ...actual,
        getWhatsAppOutboundWorkerSecret: () =>
          "outbound_worker_secret_32chars_min!!",
        isWhatsAppChannelEnabled: () => true,
        isWhatsAppOutboundEnabled: () => true,
        isWhatsAppOutboundSendAllowed: () => true,
      };
    });
    vi.doMock("@/lib/whatsapp/process-outbound", () => ({
      processPendingWhatsAppOutbound: vi.fn(async () => ({
        claimed: 0,
        sent: 0,
        retry: 0,
        failed: 0,
        unknown: 0,
        cancelled: 0,
      })),
    }));
    const mod = await import("@/app/api/internal/whatsapp/send/route");
    expect((await mod.GET()).status).toBe(405);
    expect(
      (
        await mod.POST(
          new Request("http://localhost/api/internal/whatsapp/send", {
            method: "POST",
            headers: { "x-whatsapp-outbound-worker-secret": "wrong" },
          }),
        )
      ).status,
    ).toBe(401);
    const ok = await mod.POST(
      new Request("http://localhost/api/internal/whatsapp/send", {
        method: "POST",
        headers: {
          "x-whatsapp-outbound-worker-secret":
            "outbound_worker_secret_32chars_min!!",
        },
      }),
    );
    expect(ok.status).toBe(200);
  });
});
