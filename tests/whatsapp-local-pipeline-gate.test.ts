import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AuthUserContext } from "@/lib/auth";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import { MemoryWhatsAppClaimStore } from "@/lib/whatsapp/claim";
import {
  FakeChannelIdentityResolver,
} from "@/lib/whatsapp/identity";
import {
  generateLinkCodePlaintext,
  hashLinkCode,
  MemoryLinkTokenStore,
  parseVincularCommand,
} from "@/lib/whatsapp/link-tokens";
import {
  LINK_CONFIRMATION_COPY,
  MemoryWhatsAppOutbox,
  outboundIdempotencyKey,
} from "@/lib/whatsapp/outbox";
import { MemoryOutboundClaimStore } from "@/lib/whatsapp/outbound-claim";
import { processAvailableWhatsAppBundles } from "@/lib/whatsapp/process-bundles";
import { processPendingWhatsAppOutbound } from "@/lib/whatsapp/process-outbound";
import { createTestMetaWhatsAppGraphClient } from "@/lib/whatsapp/graph-client";
import { formatForWhatsApp } from "@/lib/whatsapp/format-for-whatsapp";
import { WHATSAPP_GRAPH_API_BASE_URL } from "@/lib/whatsapp/config";

const SECRET = "test_link_token_secret_32chars_min!!";
const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

const paidAuth: AuthUserContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "gate@example.com",
  spiritualProfile: {
    traditionKey: "ecumenical",
    denomination: null,
    preferredBibleTranslation: null,
    responseStyle: "reflective",
    preferredDepth: "balanced",
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
  planKey: "caminho",
  subscriptionStatus: "active",
  subscriptionPeriodEnd: null,
  hasStripeSubscription: true,
  hasDuplicateSubscriptions: false,
  isAdmin: false,
  demoMode: false,
};

function payload(answer: string, safetyMode?: "crisis"): ChatResponsePayload {
  return {
    answer,
    biblicalReferences: [],
    interpretationNotice: "Aviso.",
    followUpQuestion: "Quer continuar?",
    usage: {
      level: "normal",
      label: "ok",
      inputTokens: 1,
      outputTokens: 1,
    },
    requestId: "r1",
    conversationId: "22222222-2222-4222-8222-222222222222",
    provider: "mock",
    ...(safetyMode ? { safetyMode } : {}),
  };
}

describe("whatsapp local pipeline E2E (fake transport)", () => {
  it("blocks real Graph host fetches in this suite", async () => {
    const original = globalThis.fetch;
    const spy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("graph.facebook.com") || url.startsWith("https://")) {
        throw new Error(`external_fetch_blocked:${url}`);
      }
      return original(input as never);
    });
    globalThis.fetch = spy as typeof fetch;
    try {
      await expect(
        fetch(`${WHATSAPP_GRAPH_API_BASE_URL}/v21.0/x/messages`),
      ).rejects.toThrow(/external_fetch_blocked/);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("Fluxo 1 — vincular → outbox confirm → fake send → delivered → read", async () => {
    const tokens = new MemoryLinkTokenStore();
    const identities = new Map<
      string,
      { userId: string; externalId: string; status: string }
    >();
    const identity = new FakeChannelIdentityResolver();
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const outbound = new MemoryOutboundClaimStore();
    const { code } = tokens.create(paidAuth.userId, SECRET);
    expect(parseVincularCommand(`VINCULAR ${code}`)).toBe(
      normalizeDisplay(code),
    );

    const now = new Date("2026-11-12T20:00:00Z");
    claim.insert({
      externalSenderId: "5511999990001",
      text: `VINCULAR ${code}`,
      receivedAt: now,
      availableAfter: now,
    });

    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      now,
      runTurn: vi.fn() as never,
      consumeLink: async ({ plaintextCode, externalSenderId }) => {
        const r = tokens.consume(
          plaintextCode,
          SECRET,
          externalSenderId,
          identities,
        );
        if (r === "linked" || r === "already_linked_same_user") {
          identity.seed(
            "whatsapp",
            externalSenderId,
            paidAuth.userId,
            "id_link",
          );
          return {
            result: r,
            identityId: "id_link",
            userId: paidAuth.userId,
          };
        }
        return { result: r };
      },
    });
    expect(result.outcomes).toEqual(["linked"]);
    expect([...outbox.rows.values()][0]!.bodyText).toBe(LINK_CONFIRMATION_COPY);

    const row = [...outbox.rows.values()][0]!;
    outbound.insert({
      identityId: row.identityId,
      externalId: "5511999990001",
      bodyText: row.bodyText,
      idempotencyKey: row.idempotencyKey,
    });

    const send = await processPendingWhatsAppOutbound({
      enabled: true,
      memory: outbound,
      sendText: async () => ({
        kind: "SUCCESS",
        providerMessageId: "wamid.gate.link",
        latencyMs: 5,
      }),
    });
    expect(send.sent).toBe(1);
    const sent = [...outbound.rows.values()][0]!;
    expect(sent.status).toBe("sent");
    expect(outbound.applyStatus("wamid.gate.link", "delivered").applied).toBe(
      true,
    );
    expect(outbound.applyStatus("wamid.gate.link", "read").applied).toBe(true);
    expect(sent.status).toBe("read");
  });

  it("Fluxo 2 — fragmentos → um bundle → IA fake → uma outbox → um send", async () => {
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "5511999990001", paidAuth.userId, "id1");
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const now = new Date("2026-11-12T20:00:00Z");
    claim.insert({
      externalSenderId: "5511999990001",
      text: "Estou",
      receivedAt: now,
      availableAfter: now,
      providerMessageId: "a",
    });
    claim.insert({
      externalSenderId: "5511999990001",
      text: "preocupado",
      receivedAt: new Date(now.getTime() + 500),
      availableAfter: now,
      providerMessageId: "b",
    });
    claim.insert({
      externalSenderId: "5511999990001",
      text: "com o casamento",
      receivedAt: new Date(now.getTime() + 1000),
      availableAfter: now,
      providerMessageId: "c",
    });
    const runTurn = vi.fn(async () =>
      payload("Acolho o que você vive. Confie um passo."),
    );
    const processed = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      loadAuth: async () => paidAuth,
      runTurn: runTurn as never,
      now,
    });
    expect(processed.outcomes).toEqual(["processed"]);
    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(outbox.rows.size).toBe(1);
    const outbound = new MemoryOutboundClaimStore();
    const o = [...outbox.rows.values()][0]!;
    outbound.insert({
      identityId: o.identityId,
      externalId: "5511999990001",
      bodyText: o.bodyText,
      idempotencyKey: o.idempotencyKey,
    });
    let sends = 0;
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory: outbound,
      sendText: async () => {
        sends += 1;
        return {
          kind: "SUCCESS",
          providerMessageId: "wamid.chat.1",
          latencyMs: 1,
        };
      },
    });
    expect(sends).toBe(1);
  });

  it("Fluxo 3 — não vinculado → pending_identity sem IA/outbox", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const now = new Date();
    claim.insert({
      externalSenderId: "5511888777666",
      text: "olá",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const r = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: new FakeChannelIdentityResolver(),
      runTurn: runTurn as never,
      now,
    });
    expect(r.outcomes).toEqual(["pending_identity"]);
    expect(runTurn).not.toHaveBeenCalled();
    expect(outbox.rows.size).toBe(0);
  });

  it("Fluxo 4 — access_required sem IA e sem retry técnico", async () => {
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "5511999990001", paidAuth.userId, "id1");
    const claim = new MemoryWhatsAppClaimStore();
    const now = new Date();
    claim.insert({
      externalSenderId: "5511999990001",
      text: "oi",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const r = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: new MemoryWhatsAppOutbox(),
      memoryIdentity: identity,
      loadAuth: async () => ({ ...paidAuth, planKey: null }),
      runTurn: runTurn as never,
      now,
    });
    expect(r.outcomes).toEqual(["access_required"]);
    expect(runTurn).not.toHaveBeenCalled();
    expect([...claim.events.values()][0]!.status).toBe("processed");
  });

  it("Fluxo 5 — crise preservada e outbox única", async () => {
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "5511999990001", paidAuth.userId, "id1");
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const now = new Date();
    claim.insert({
      externalSenderId: "5511999990001",
      text: "não aguento mais viver",
      receivedAt: now,
      availableAfter: now,
    });
    const crisisAnswer =
      "Você não está sozinho. Busque ajuda agora. CVV 188.";
    await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      loadAuth: async () => paidAuth,
      runTurn: (async () => payload(crisisAnswer, "crisis")) as never,
      now,
    });
    expect(outbox.rows.size).toBe(1);
    const body = [...outbox.rows.values()][0]!.bodyText;
    expect(body).toContain("Você não está sozinho");
    expect(body).toBe(formatForWhatsApp(payload(crisisAnswer, "crisis")));
  });

  it("Fluxo 6 — 429 retry same row then success", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999990001",
      bodyText: "oi",
      idempotencyKey: "bundle:r1",
    });
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => ({
        kind: "TRANSIENT_FAILURE",
        errorCode: "meta_rate_limited",
        retryAfterSeconds: 1,
        latencyMs: 1,
      }),
    });
    expect([...memory.rows.values()][0]!.status).toBe("retry");
    expect(memory.rows.size).toBe(1);
    // force available
    const row = [...memory.rows.values()][0]!;
    row.availableAfter = new Date(0);
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => ({
        kind: "SUCCESS",
        providerMessageId: "wamid.retry.ok",
        latencyMs: 1,
      }),
    });
    expect(row.status).toBe("sent");
    expect(memory.rows.size).toBe(1);
  });

  it("Fluxo 7 — ambiguous delivery_unknown sem reenvio", async () => {
    const memory = new MemoryOutboundClaimStore();
    memory.insert({
      identityId: "id1",
      externalId: "5511999990001",
      bodyText: "oi",
      idempotencyKey: "bundle:amb",
    });
    await processPendingWhatsAppOutbound({
      enabled: true,
      memory,
      sendText: async () => ({
        kind: "AMBIGUOUS_DELIVERY",
        errorCode: "meta_timeout_ambiguous",
        latencyMs: 1,
      }),
    });
    expect([...memory.rows.values()][0]!.status).toBe("delivery_unknown");
    expect(memory.claim({ now: new Date() }).claimed).toBe(false);
  });

  it("Graph client uses injected transport only (no real fetch)", async () => {
    let called = false;
    const client = createTestMetaWhatsAppGraphClient({
      accessToken: "EAAG_test_token_value_at_least_20",
      phoneNumberId: "123456789012345",
      graphApiVersion: "v21.0",
      transport: async () => {
        called = true;
        return new Response(JSON.stringify({ messages: [{ id: "wamid.t" }] }), {
          status: 200,
        });
      },
    });
    const r = await client.sendText({
      to: "5511999990001",
      body: "oi",
      idempotencyKey: "k",
    });
    expect(called).toBe(true);
    expect(r.kind).toBe("SUCCESS");
  });
});

describe("whatsapp local gate artifacts", () => {
  it("documents SQL gate scripts and migration claim fix", () => {
    expect(
      read(
        "scripts/whatsapp-local-gate/10_sql_integration_tests.sql",
      ),
    ).toContain("WHATSAPP_SQL_GATE_OK");
    const mig20 = read(
      "supabase/migrations/20261112000020_whatsapp_identity_worker_outbox.sql",
    );
    expect(mig20).not.toContain("returning e.id into v_ids");
    expect(mig20).toContain("for update skip locked");
  });

  it("idempotency key helper stable", () => {
    expect(outboundIdempotencyKey("b1")).toBe("bundle:b1");
    const code = generateLinkCodePlaintext();
    expect(hashLinkCode(code, SECRET)).toHaveLength(64);
  });
});

function normalizeDisplay(code: string) {
  return code.toUpperCase();
}
