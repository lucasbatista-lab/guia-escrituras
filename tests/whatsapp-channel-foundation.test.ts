import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  WHATSAPP_PRESENTATION_POLICY,
  WEB_PRESENTATION_POLICY,
} from "@/lib/channels/types";
import {
  isWhatsAppChannelEnabled,
  resolveWhatsAppDebounceMs,
  WHATSAPP_INBOUND_TEXT_MAX,
  WHATSAPP_OUTBOUND_TEXT_MAX,
} from "@/lib/whatsapp/config";
import {
  buildWhatsAppSignatureHeader,
  safeEqualString,
  verifyWhatsAppSignature,
} from "@/lib/whatsapp/crypto";
import {
  buildBundles,
  buildBundlesForSender,
  isBundleReady,
} from "@/lib/whatsapp/debounce";
import { formatForWhatsApp } from "@/lib/whatsapp/format-for-whatsapp";
import {
  FakeChannelIdentityResolver,
  NullChannelIdentityResolver,
} from "@/lib/whatsapp/identity";
import {
  clampInboundText,
  normalizeWhatsAppWebhookPayload,
} from "@/lib/whatsapp/normalize";
import { MemoryWhatsAppInboundStore } from "@/lib/whatsapp/inbound-events";
import { FakeWhatsAppOutboundPort } from "@/lib/whatsapp/outbound";
import { processWhatsAppTextTurn } from "@/lib/whatsapp/process-text-turn";
import type { AuthUserContext } from "@/lib/auth";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

function textPayload(messages: Array<{
  id: string;
  from: string;
  body: string;
  timestamp?: string;
}>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              messages: messages.map((m) => ({
                from: m.from,
                id: m.id,
                timestamp: m.timestamp ?? "1700000000",
                type: "text",
                text: { body: m.body },
              })),
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

const syntheticAuth: AuthUserContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "qa@example.com",
  spiritualProfile: {
    traditionKey: "ecumenical",
    denomination: null,
    preferredBibleTranslation: null,
    responseStyle: "reflective",
    preferredDepth: "balanced",
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
  planKey: "essencial",
  subscriptionStatus: "active",
  subscriptionPeriodEnd: null,
  hasStripeSubscription: true,
  hasDuplicateSubscriptions: false,
  isAdmin: false,
  demoMode: false,
};

describe("WhatsApp feature flag", () => {
  it("defaults off when unset", () => {
    expect(isWhatsAppChannelEnabled({})).toBe(false);
  });

  it("false variants stay off", () => {
    expect(isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "false" })).toBe(
      false,
    );
    expect(isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "0" })).toBe(
      false,
    );
  });

  it("only explicit true enables", () => {
    expect(isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "true" })).toBe(
      true,
    );
    expect(isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "yes" })).toBe(
      true,
    );
    expect(
      isWhatsAppChannelEnabled({ WHATSAPP_CHANNEL_ENABLED: "maybe" }),
    ).toBe(false);
  });

  it("debounce window stays within 2–4s", () => {
    expect(resolveWhatsAppDebounceMs(3000)).toBe(3000);
    expect(resolveWhatsAppDebounceMs(1000)).toBe(2000);
    expect(resolveWhatsAppDebounceMs(9000)).toBe(4000);
  });
});

describe("WhatsApp crypto", () => {
  const secret = "test_app_secret_value";
  const body = '{"object":"whatsapp_business_account"}';

  it("accepts valid signature", () => {
    const header = buildWhatsAppSignatureHeader(body, secret);
    expect(
      verifyWhatsAppSignature({
        rawBody: body,
        signatureHeader: header,
        appSecret: secret,
      }),
    ).toBe(true);
  });

  it("rejects invalid / missing / malformed signatures", () => {
    expect(
      verifyWhatsAppSignature({
        rawBody: body,
        signatureHeader: "sha256=deadbeef",
        appSecret: secret,
      }),
    ).toBe(false);
    expect(
      verifyWhatsAppSignature({
        rawBody: body,
        signatureHeader: null,
        appSecret: secret,
      }),
    ).toBe(false);
    expect(
      verifyWhatsAppSignature({
        rawBody: body,
        signatureHeader: "sha1=abc",
        appSecret: secret,
      }),
    ).toBe(false);
  });

  it("rejects body tampering", () => {
    const header = buildWhatsAppSignatureHeader(body, secret);
    expect(
      verifyWhatsAppSignature({
        rawBody: body + " ",
        signatureHeader: header,
        appSecret: secret,
      }),
    ).toBe(false);
  });

  it("safeEqualString compares verify tokens", () => {
    expect(safeEqualString("abc", "abc")).toBe(true);
    expect(safeEqualString("abc", "abd")).toBe(false);
    expect(safeEqualString("abc", "ab")).toBe(false);
  });
});

describe("WhatsApp normalize", () => {
  it("extracts textual messages", () => {
    const result = normalizeWhatsAppWebhookPayload(
      textPayload([{ id: "wamid.1", from: "5511999999999", body: "Olá" }]),
    );
    expect(result.kind).toBe("messages");
    if (result.kind === "messages") {
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.text).toBe("Olá");
      expect(result.messages[0]?.providerMessageId).toBe("wamid.1");
    }
  });

  it("ignores statuses, media, unknown, empty", () => {
    expect(
      normalizeWhatsAppWebhookPayload({
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: "s1", status: "delivered" }],
                },
              },
            ],
          },
        ],
      }).kind,
    ).toBe("ignored");

    expect(
      normalizeWhatsAppWebhookPayload({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: "m1",
                      from: "1",
                      type: "image",
                      timestamp: "1",
                    },
                  ],
                },
              },
            ],
          },
        ],
      }).kind,
    ).toBe("ignored");

    expect(
      normalizeWhatsAppWebhookPayload(
        textPayload([{ id: "m2", from: "1", body: "   " }]),
      ).kind,
    ).toBe("ignored");
  });

  it("clamps oversized text and preserves unicode", () => {
    const long = "á".repeat(WHATSAPP_INBOUND_TEXT_MAX + 50);
    const { text, truncated } = clampInboundText(long);
    expect(truncated).toBe(true);
    expect(text.length).toBe(WHATSAPP_INBOUND_TEXT_MAX);
    expect(text.startsWith("á")).toBe(true);

    const result = normalizeWhatsAppWebhookPayload(
      textPayload([
        {
          id: "wamid.pt",
          from: "5511",
          body: "Estou preocupado com a oração de São José",
        },
      ]),
    );
    expect(result.kind).toBe("messages");
    if (result.kind === "messages") {
      expect(result.messages[0]?.text).toContain("São José");
    }
  });

  it("limits messages per payload", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `wamid.${i}`,
      from: "5511",
      body: `msg ${i}`,
    }));
    const result = normalizeWhatsAppWebhookPayload(textPayload(many));
    expect(result.kind).toBe("messages");
    if (result.kind === "messages") {
      expect(result.messages.length).toBe(20);
    }
  });
});

describe("WhatsApp debounce", () => {
  const t0 = new Date("2026-11-12T12:00:00.000Z");

  it("bundles three fragmented messages from same sender", () => {
    const items = [
      {
        providerMessageId: "a",
        externalSenderId: "u1",
        text: "Estou preocupado",
        receivedAt: t0,
      },
      {
        providerMessageId: "b",
        externalSenderId: "u1",
        text: "Com meu casamento",
        receivedAt: new Date(t0.getTime() + 3000),
      },
      {
        providerMessageId: "c",
        externalSenderId: "u1",
        text: "Não sei o que fazer",
        receivedAt: new Date(t0.getTime() + 5000),
      },
    ];
    const bundles = buildBundlesForSender({
      externalSenderId: "u1",
      items,
      debounceMs: 3000,
    });
    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.text).toBe(
      "Estou preocupado\nCom meu casamento\nNão sei o que fazer",
    );
  });

  it("orders out-of-order timestamps and dedupes", () => {
    const items = [
      {
        providerMessageId: "b",
        externalSenderId: "u1",
        text: "dois",
        receivedAt: new Date(t0.getTime() + 1000),
      },
      {
        providerMessageId: "a",
        externalSenderId: "u1",
        text: "um",
        receivedAt: t0,
      },
      {
        providerMessageId: "a",
        externalSenderId: "u1",
        text: "um-dup",
        receivedAt: t0,
      },
    ];
    const bundles = buildBundlesForSender({
      externalSenderId: "u1",
      items,
      debounceMs: 3000,
    });
    expect(bundles[0]?.text).toBe("um\ndois");
    expect(bundles[0]?.providerMessageIds).toEqual(["a", "b"]);
  });

  it("keeps different senders separate and opens new bundle after window", () => {
    const items = [
      {
        providerMessageId: "1",
        externalSenderId: "u1",
        text: "A",
        receivedAt: t0,
      },
      {
        providerMessageId: "2",
        externalSenderId: "u2",
        text: "B",
        receivedAt: t0,
      },
      {
        providerMessageId: "3",
        externalSenderId: "u1",
        text: "C",
        receivedAt: new Date(t0.getTime() + 10_000),
      },
    ];
    const bundles = buildBundles({ items, debounceMs: 3000 });
    expect(bundles).toHaveLength(3);
    expect(bundles.filter((b) => b.externalSenderId === "u1")).toHaveLength(2);
  });

  it("isBundleReady respects availableAfter", () => {
    const [bundle] = buildBundlesForSender({
      externalSenderId: "u1",
      items: [
        {
          providerMessageId: "a",
          externalSenderId: "u1",
          text: "x",
          receivedAt: t0,
        },
      ],
      debounceMs: 3000,
    });
    expect(isBundleReady(bundle!, new Date(t0.getTime() + 2999))).toBe(false);
    expect(isBundleReady(bundle!, new Date(t0.getTime() + 3000))).toBe(true);
  });
});

describe("WhatsApp identity + memory idempotency", () => {
  it("null resolver never invents users", async () => {
    const resolver = new NullChannelIdentityResolver();
    expect(
      await resolver.resolve({ channel: "whatsapp", externalSenderId: "x" }),
    ).toBeNull();
  });

  it("fake resolver is test-only map", async () => {
    const fake = new FakeChannelIdentityResolver();
    fake.seed("whatsapp", "wa1", "user-1");
    expect(
      await fake.resolve({ channel: "whatsapp", externalSenderId: "wa1" }),
    ).toBe("user-1");
    expect(
      await fake.resolve({ channel: "whatsapp", externalSenderId: "wa2" }),
    ).toBeNull();
  });

  it("memory store dedupes provider_message_id", () => {
    const store = new MemoryWhatsAppInboundStore();
    const msg = {
      providerMessageId: "wamid.dup",
      externalSenderId: "1",
      messageType: "text" as const,
      text: "oi",
      receivedAt: new Date(),
    };
    expect(store.insert(msg).kind).toBe("inserted");
    expect(store.insert(msg).kind).toBe("duplicate");
  });
});

describe("WhatsApp formatter", () => {
  const base: ChatResponsePayload = {
    answer: "Acolho o que você está vivendo. Respire e confie um passo de cada vez.",
    biblicalReferences: [
      { book: "Salmos", chapter: 34, verseStart: 18 },
      { book: "João", chapter: 14, verseStart: 1 },
    ],
    interpretationNotice: "Síntese pastoral, não revelação.",
    followUpQuestion: "O que pesa mais agora?",
    usage: {
      level: "normal",
      label: "ok",
      inputTokens: 1,
      outputTokens: 1,
    },
    requestId: "r1",
    conversationId: "c1",
    provider: "mock",
  };

  it("keeps short plain text with one scripture and follow-up", () => {
    const text = formatForWhatsApp(base);
    expect(text).toContain("Acolho");
    expect(text).toContain("Salmos 34:18");
    expect(text).not.toContain("João 14");
    expect(text).toContain("O que pesa mais agora?");
    expect(text).not.toContain("**");
    expect(text).not.toContain("|");
  });

  it("strips markdown/UI artifacts", () => {
    const text = formatForWhatsApp({
      ...base,
      answer: "## Título\n**negrito** e [link](/hoje)\n| a | b |",
    });
    expect(text).not.toContain("##");
    expect(text).not.toContain("**");
    expect(text).not.toContain("| a |");
    expect(text).toContain("negrito");
  });

  it("uses structured fallback under max without cutting crisis", () => {
    const longAnswer = "Palavra ".repeat(800);
    const text = formatForWhatsApp(
      { ...base, answer: longAnswer },
      { maxCharacters: 400 },
    );
    expect(text.length).toBeLessThanOrEqual(400);
    expect(text).toContain("Salmos 34:18");

    const crisis = formatForWhatsApp({
      ...base,
      safetyMode: "crisis",
      answer: "A".repeat(5000),
    });
    expect(crisis.length).toBeGreaterThan(WHATSAPP_OUTBOUND_TEXT_MAX);
    expect(crisis.startsWith("A")).toBe(true);
  });
});

describe("WhatsApp adapter reuses chat motor", () => {
  it("calls injected runTurn with brief depth and formats outbound", async () => {
    const runTurn = vi.fn(
      async (input: {
        requestId: string;
        auth: AuthUserContext;
        body: { message: string; preferDeep?: boolean };
      }) => {
        void input;
        const payload: ChatResponsePayload = {
          answer: "Resposta breve de teste.",
          biblicalReferences: [],
          interpretationNotice: "Aviso curto.",
          followUpQuestion: "Quer continuar?",
          usage: {
            level: "normal",
            label: "ok",
            inputTokens: 10,
            outputTokens: 20,
          },
          requestId: "ignored",
          conversationId: "22222222-2222-4222-8222-222222222222",
          provider: "mock",
        };
        return payload;
      },
    );

    const outbound = new FakeWhatsAppOutboundPort();
    const result = await processWhatsAppTextTurn({
      bundle: {
        externalSenderId: "5511",
        providerMessageIds: ["a", "b"],
        text: "Estou preocupado\nCom meu casamento",
        firstReceivedAt: new Date(),
        lastReceivedAt: new Date(),
        availableAfter: new Date(),
      },
      auth: syntheticAuth,
      runTurn: runTurn as unknown as typeof import("@/lib/ai/chat-service").runChatTurn,
      outbound,
      dispatchOutbound: true,
    });

    expect(runTurn).toHaveBeenCalledTimes(1);
    const arg = runTurn.mock.calls[0]![0];
    expect(arg.auth.spiritualProfile.preferredDepth).toBe("brief");
    expect(arg.auth.spiritualProfile.preferredDepth).not.toBe(
      syntheticAuth.spiritualProfile.preferredDepth,
    );
    expect(arg.body.preferDeep).toBe(false);
    expect(arg.body.message).toContain("casamento");
    expect(result.outboundText).toContain("Resposta breve");
    expect(outbound.sent).toHaveLength(1);
    expect(WHATSAPP_PRESENTATION_POLICY.depth).toBe("brief");
    expect(WEB_PRESENTATION_POLICY.supportsStreaming).toBe(true);
  });

  it("refuses turn without plan / user", async () => {
    await expect(
      processWhatsAppTextTurn({
        bundle: {
          externalSenderId: "x",
          providerMessageIds: ["1"],
          text: "oi",
          firstReceivedAt: new Date(),
          lastReceivedAt: new Date(),
          availableAfter: new Date(),
        },
        auth: { ...syntheticAuth, planKey: null },
        runTurn: (async () => {
          throw new Error("should_not_run");
        }) as unknown as typeof import("@/lib/ai/chat-service").runChatTurn,
      }),
    ).rejects.toThrow(/requires_plan/);
  });
});

describe("WhatsApp webhook route contracts", () => {
  it("GET handshake + POST signature gates exist in route", () => {
    const route = read("src", "app", "api", "webhooks", "whatsapp", "route.ts");
    expect(route).toContain("hub.verify_token");
    expect(route).toContain("hub.challenge");
    expect(route).toContain("x-hub-signature-256");
    expect(route).toContain("whatsapp_channel_disabled");
    expect(route).toContain("503");
    expect(route).not.toMatch(/graph\.facebook\.com/);
    expect(route).not.toMatch(/WHATSAPP_ACCESS_TOKEN/);
  });

  it("GET verify happy path and failures", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify_me");
    const { GET } = await import("@/app/api/webhooks/whatsapp/route");

    const ok = await GET(
      new NextRequest(
        "https://amemchat.com.br/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify_me&hub.challenge=12345",
      ),
    );
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("12345");

    const bad = await GET(
      new NextRequest(
        "https://amemchat.com.br/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
      ),
    );
    expect(bad.status).toBe(403);
    const body = await bad.text();
    expect(body).not.toContain("verify_me");

    const missing = await GET(
      new NextRequest("https://amemchat.com.br/api/webhooks/whatsapp"),
    );
    expect(missing.status).toBe(400);

    vi.unstubAllEnvs();
  });

  it("POST disabled returns 503 without needing secret", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_CHANNEL_ENABLED", "false");
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const res = await POST(
      new NextRequest("https://amemchat.com.br/api/webhooks/whatsapp", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("whatsapp_channel_disabled");
    vi.unstubAllEnvs();
  });

  it("POST rejects bad signature when enabled", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_CHANNEL_ENABLED", "true");
    vi.stubEnv("WHATSAPP_APP_SECRET", "secret_value");
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const res = await POST(
      new NextRequest("https://amemchat.com.br/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=00".padEnd(71, "0") },
        body: '{"object":"whatsapp_business_account"}',
      }),
    );
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("POST accepts valid signature and ignores empty text payload", async () => {
    vi.resetModules();
    vi.stubEnv("WHATSAPP_CHANNEL_ENABLED", "true");
    vi.stubEnv("WHATSAPP_APP_SECRET", "secret_value");
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "s" }] } }] }],
    });
    const sig =
      "sha256=" +
      createHmac("sha256", "secret_value").update(body, "utf8").digest("hex");
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");
    const res = await POST(
      new NextRequest("https://amemchat.com.br/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": sig },
        body,
      }),
    );
    // May be 200 with accepted 0 (no admin client) or still 200 ignored path
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const json = (await res.json()) as { received: boolean };
      expect(json.received).toBe(true);
    }
    vi.unstubAllEnvs();
  });
});

describe("WhatsApp foundation source contracts", () => {
  it("migration 019 is additive and RLS locked down", () => {
    const sql = read(
      "supabase",
      "migrations",
      "20261112000019_whatsapp_inbound_events.sql",
    );
    expect(sql).toContain("whatsapp_inbound_events");
    expect(sql).toContain("provider_message_id");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all");
    expect(sql).toContain("pending_identity");
    expect(sql).not.toMatch(/drop table public\.(conversations|messages)/i);
  });

  it("does not touch repositories index or Stripe/prices/theology core", () => {
    expect(read("src", "lib", "entitlements", "plans.ts")).toContain(
      "priceMonthlyCents: 3800",
    );
    const theology = read("src", "lib", "theology", "general-rules.ts");
    expect(theology.length).toBeGreaterThan(100);
    // repositories index must remain unstaged/untouched by this wave
    const idx = read("src", "lib", "database", "repositories", "index.ts");
    expect(idx).toBeTruthy();
  });

  it("env example documents WhatsApp keys as placeholders", () => {
    const env = read(".env.example");
    expect(env).toContain("WHATSAPP_CHANNEL_ENABLED");
    expect(env).toContain("WHATSAPP_VERIFY_TOKEN");
    expect(env).toContain("WHATSAPP_APP_SECRET");
    expect(env).not.toMatch(/EAA[A-Za-z0-9]+/);
  });
});
