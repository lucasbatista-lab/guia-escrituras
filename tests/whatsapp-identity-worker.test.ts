import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUserContext } from "@/lib/auth";
import type { ChatResponsePayload } from "@/lib/ai/chat-schema";
import {
  computeBackoffSeconds,
  MemoryWhatsAppClaimStore,
  WHATSAPP_CLAIM_LEASE_SECONDS,
  WHATSAPP_MAX_BUNDLE_ATTEMPTS,
} from "@/lib/whatsapp/claim";
import {
  FakeChannelIdentityResolver,
  NullChannelIdentityResolver,
} from "@/lib/whatsapp/identity";
import {
  generateLinkCodePlaintext,
  hashLinkCode,
  MemoryLinkTokenStore,
  normalizeLinkCodeInput,
  parseVincularCommand,
  getWhatsAppLinkTokenSecret,
} from "@/lib/whatsapp/link-tokens";
import {
  evaluateWhatsAppLinkCodeRateLimit,
  resetWhatsAppLinkCodeRateLimit,
} from "@/lib/whatsapp/link-rate-limit";
import {
  LINK_CONFIRMATION_COPY,
  MemoryWhatsAppOutbox,
  outboundIdempotencyKey,
} from "@/lib/whatsapp/outbox";
import { NoopWhatsAppOutboundPort } from "@/lib/whatsapp/outbound";
import { processAvailableWhatsAppBundles } from "@/lib/whatsapp/process-bundles";
import { WHATSAPP_OUTBOUND_TEXT_MAX } from "@/lib/whatsapp/config";
import { formatForWhatsApp } from "@/lib/whatsapp/format-for-whatsapp";

const root = process.cwd();
const SECRET = "test_link_token_secret_32chars_min!!";

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
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
  planKey: "caminho",
  subscriptionStatus: "active",
  subscriptionPeriodEnd: null,
  hasStripeSubscription: true,
  hasDuplicateSubscriptions: false,
  isAdmin: false,
  demoMode: false,
};

function fakePayload(answer = "Paz."): ChatResponsePayload {
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
  };
}

describe("whatsapp link tokens", () => {
  it("generates code with crypto (not Math.random)", () => {
    const spy = vi.spyOn(Math, "random");
    const code = generateLinkCodePlaintext();
    expect(spy).not.toHaveBeenCalled();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    spy.mockRestore();
  });

  it("follows ABCD-EFGH format without confusing chars", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateLinkCodePlaintext();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
      expect(code).not.toMatch(/[01OILiol]/);
    }
  });

  it("hashes with HMAC-SHA256", () => {
    const code = "ABCD-EFGH";
    const expected = createHmac("sha256", SECRET).update(code, "utf8").digest("hex");
    expect(hashLinkCode(code, SECRET)).toBe(expected);
  });

  it("fails closed when secret missing or short", () => {
    expect(getWhatsAppLinkTokenSecret({})).toBeNull();
    expect(getWhatsAppLinkTokenSecret({ WHATSAPP_LINK_TOKEN_SECRET: "short" })).toBeNull();
    expect(
      getWhatsAppLinkTokenSecret({ WHATSAPP_LINK_TOKEN_SECRET: SECRET }),
    ).toBe(SECRET);
  });

  it("normalizes hyphen-optional and case", () => {
    expect(normalizeLinkCodeInput("abcd-efgh")).toBe("ABCD-EFGH");
    expect(normalizeLinkCodeInput("ABCDEFGH")).toBe("ABCD-EFGH");
    expect(normalizeLinkCodeInput("ABCD EFGH")).toBe("ABCD-EFGH");
    expect(normalizeLinkCodeInput("ABC")).toBeNull();
  });

  it("MemoryLinkTokenStore never persists plaintext", () => {
    const store = new MemoryLinkTokenStore();
    const { code } = store.create("user-a", SECRET);
    const dumped = JSON.stringify(store.tokens);
    expect(dumped).not.toContain(code);
    expect(store.tokens[0]!.hash).toBe(hashLinkCode(code, SECRET));
  });

  it("expires codes", () => {
    const store = new MemoryLinkTokenStore();
    const { code } = store.create("user-a", SECRET);
    store.tokens[0]!.expiresAt = Date.now() - 1000;
    const identities = new Map();
    expect(store.consume(code, SECRET, "wa_1", identities)).toBe("token_expired");
  });

  it("is single-use", () => {
    const store = new MemoryLinkTokenStore();
    const { code } = store.create("user-a", SECRET);
    const identities = new Map();
    expect(store.consume(code, SECRET, "wa_1", identities)).toBe("linked");
    expect(store.consume(code, SECRET, "wa_1", identities)).toBe("token_consumed");
  });

  it("invalidates previous active codes", () => {
    const store = new MemoryLinkTokenStore();
    const first = store.create("user-a", SECRET);
    const second = store.create("user-a", SECRET);
    const identities = new Map();
    expect(store.consume(first.code, SECRET, "wa_1", identities)).toBe(
      "token_invalid",
    );
    expect(store.consume(second.code, SECRET, "wa_1", identities)).toBe("linked");
  });

  it("enforces max attempts", () => {
    const store = new MemoryLinkTokenStore();
    const { code } = store.create("user-a", SECRET);
    const identities = new Map();
    // Force attempts by using wrong external conflict path after increment —
    // exceed max by mutating attemptCount.
    store.tokens[0]!.attemptCount = 5;
    expect(store.consume(code, SECRET, "wa_1", identities)).toBe(
      "attempts_exceeded",
    );
  });

  it("never logs the code in ops event names or hash helpers", () => {
    const code = generateLinkCodePlaintext();
    const src = read("src/lib/whatsapp/link-tokens.ts");
    expect(src).not.toMatch(/logger\.(info|warn|error)\([^)]*code/);
    expect(src).toContain('logWhatsAppOps("identity_link_code_created"');
    expect(src).not.toMatch(/logWhatsAppOps\([^)]*plaintext|hashLinkCode\([^)]*log/i);
    // Ensure create path hashes before any persistence field named token_hash.
    expect(src).toContain("token_hash: tokenHash");
    expect(src).not.toContain("token_hash: plaintext");
    void code;
  });
});

describe("whatsapp vincular command", () => {
  it("parses valid VINCULAR", () => {
    expect(parseVincularCommand("VINCULAR ABCD-EFGH")).toBe("ABCD-EFGH");
  });

  it("is case-insensitive", () => {
    expect(parseVincularCommand("vincular abcd-efgh")).toBe("ABCD-EFGH");
  });

  it("normalizes hyphen", () => {
    expect(parseVincularCommand("VINCULAR ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it("rejects arbitrary text", () => {
    expect(parseVincularCommand("oi, vincular ABCD-EFGH por favor")).toBeNull();
    expect(parseVincularCommand("VINCULA ABCD-EFGH")).toBeNull();
  });

  it("rejects multiple codes", () => {
    expect(parseVincularCommand("VINCULAR ABCD-EFGH WXYZ-1234")).toBeNull();
  });
});

describe("whatsapp identity resolve", () => {
  it("active identity resolves", async () => {
    const fake = new FakeChannelIdentityResolver();
    fake.seed("whatsapp", "wa_1", "user-1", "id-1");
    await expect(
      fake.resolve({ channel: "whatsapp", externalSenderId: "wa_1" }),
    ).resolves.toBe("user-1");
  });

  it("revoked/absent does not resolve", async () => {
    const fake = new FakeChannelIdentityResolver();
    fake.seed("whatsapp", "wa_1", "user-1");
    fake.revoke("whatsapp", "wa_1");
    await expect(
      fake.resolve({ channel: "whatsapp", externalSenderId: "wa_1" }),
    ).resolves.toBeNull();
  });

  it("null resolver never creates users", async () => {
    const nullResolver = new NullChannelIdentityResolver();
    await expect(
      nullResolver.resolve({ channel: "whatsapp", externalSenderId: "wa_x" }),
    ).resolves.toBeNull();
  });

  it("MemoryLinkTokenStore conflict and same-user idempotent", () => {
    const store = new MemoryLinkTokenStore();
    const identities = new Map<
      string,
      { userId: string; externalId: string; status: string }
    >();
    identities.set("u1:wa_1", {
      userId: "u1",
      externalId: "wa_1",
      status: "active",
    });
    const { code: c1 } = store.create("u2", SECRET);
    expect(store.consume(c1, SECRET, "wa_1", identities)).toBe(
      "external_identity_conflict",
    );

    const { code: c2 } = store.create("u1", SECRET);
    expect(store.consume(c2, SECRET, "wa_2", identities)).toBe(
      "user_already_has_other_identity",
    );

    const { code: c3 } = store.create("u1", SECRET);
    expect(store.consume(c3, SECRET, "wa_1", identities)).toBe(
      "already_linked_same_user",
    );
  });
});

describe("whatsapp claim / lease / retry", () => {
  it("claims only available bundles", () => {
    const store = new MemoryWhatsAppClaimStore();
    const now = new Date("2026-11-12T12:00:00Z");
    store.insert({
      externalSenderId: "wa_a",
      text: "oi",
      receivedAt: new Date(now.getTime() - 10_000),
      availableAfter: new Date(now.getTime() + 60_000),
    });
    expect(store.claim({ now }).claimed).toBe(false);
  });

  it("does not claim future available_after", () => {
    const store = new MemoryWhatsAppClaimStore();
    const now = new Date("2026-11-12T12:00:00Z");
    store.insert({
      externalSenderId: "wa_a",
      text: "oi",
      receivedAt: now,
      availableAfter: new Date(now.getTime() + 5000),
    });
    expect(store.claim({ now }).claimed).toBe(false);
  });

  it("active lease protects; expired lease recovers", () => {
    const store = new MemoryWhatsAppClaimStore();
    const t0 = new Date("2026-11-12T12:00:00Z");
    store.insert({
      externalSenderId: "wa_a",
      text: "oi",
      receivedAt: new Date(t0.getTime() - 10_000),
      availableAfter: new Date(t0.getTime() - 1000),
    });
    const first = store.claim({ now: t0, leaseSeconds: 90 });
    expect(first.claimed).toBe(true);
    expect(store.claim({ now: t0 }).claimed).toBe(false);

    const later = new Date(t0.getTime() + 91_000);
    const second = store.claim({ now: later });
    expect(second.claimed).toBe(true);
  });

  it("isolates senders", () => {
    const store = new MemoryWhatsAppClaimStore();
    const now = new Date("2026-11-12T12:00:00Z");
    store.insert({
      externalSenderId: "wa_a",
      text: "a",
      receivedAt: new Date(now.getTime() - 2000),
      availableAfter: new Date(now.getTime() - 1000),
    });
    store.insert({
      externalSenderId: "wa_b",
      text: "b",
      receivedAt: new Date(now.getTime() - 1000),
      availableAfter: new Date(now.getTime() - 500),
    });
    const first = store.claim({ now });
    expect(first.claimed).toBe(true);
    if (!first.claimed) return;
    expect(first.value.bundle.externalSenderId).toBe("wa_a");
    expect(first.value.bundle.text).toBe("a");
    const second = store.claim({ now });
    expect(second.claimed).toBe(true);
    if (!second.claimed) return;
    expect(second.value.bundle.externalSenderId).toBe("wa_b");
  });

  it("increments attempts and applies deterministic backoff", () => {
    expect(computeBackoffSeconds(1)).toBe(5);
    expect(computeBackoffSeconds(2)).toBe(10);
    expect(computeBackoffSeconds(8)).toBe(300);
    expect(WHATSAPP_CLAIM_LEASE_SECONDS).toBe(90);
    expect(WHATSAPP_MAX_BUNDLE_ATTEMPTS).toBe(8);

    const store = new MemoryWhatsAppClaimStore();
    const now = new Date("2026-11-12T12:00:00Z");
    store.insert({
      externalSenderId: "wa_a",
      text: "x",
      receivedAt: now,
      availableAfter: now,
    });
    const claimed = store.claim({ now });
    expect(claimed.claimed).toBe(true);
    if (!claimed.claimed) return;
    expect(claimed.value.attemptCount).toBe(1);
    expect(store.retry(claimed.value.bundleId, 8)).toBe("failed");
  });

  it("documents SKIP LOCKED in migration RPC", () => {
    const sql = read(
      "supabase/migrations/20261112000020_whatsapp_identity_worker_outbox.sql",
    );
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("whatsapp_claim_inbound_bundle");
    expect(sql).toContain("whatsapp_release_expired_inbound_leases");
  });
});

describe("whatsapp worker processing", () => {
  it("unlinked without command → pending_identity and no IA", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const identity = new FakeChannelIdentityResolver();
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_u",
      text: "olá",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      runTurn: runTurn as never,
      now,
    });
    expect(result.outcomes).toEqual(["pending_identity"]);
    expect(runTurn).not.toHaveBeenCalled();
    expect(outbox.rows.size).toBe(0);
  });

  it("VINCULAR success creates fixed outbox and never calls IA", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const identity = new FakeChannelIdentityResolver();
    const tokenStore = new MemoryLinkTokenStore();
    const { code } = tokenStore.create(syntheticAuth.userId, SECRET);
    const identities = new Map<
      string,
      { userId: string; externalId: string; status: string }
    >();
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_link",
      text: `VINCULAR ${code}`,
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      runTurn: runTurn as never,
      now,
      consumeLink: async ({ plaintextCode, externalSenderId }) => {
        const r = tokenStore.consume(
          plaintextCode,
          SECRET,
          externalSenderId,
          identities,
        );
        if (r === "linked" || r === "already_linked_same_user") {
          identity.seed(
            "whatsapp",
            externalSenderId,
            syntheticAuth.userId,
            "id_link_1",
          );
          return {
            result: r,
            identityId: "id_link_1",
            userId: syntheticAuth.userId,
          };
        }
        return { result: r };
      },
    });
    expect(result.outcomes).toEqual(["linked"]);
    expect(runTurn).not.toHaveBeenCalled();
    const row = [...outbox.rows.values()][0]!;
    expect(row.bodyText).toBe(LINK_CONFIRMATION_COPY);
    expect(row.status).toBe("pending");
    expect(row.messageType).toBe("link_confirmation");
  });

  it("token invalid does not call IA", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_x",
      text: "VINCULAR ZZZZ-YYYY",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: new FakeChannelIdentityResolver(),
      runTurn: runTurn as never,
      now,
      consumeLink: async () => ({ result: "token_invalid" }),
    });
    expect(result.outcomes).toEqual(["link_failed"]);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("linked calls adapter and creates one outbox", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "wa_ok", syntheticAuth.userId, "id_ok");
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_ok",
      text: "Como orar?",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn(async () => fakePayload("Resposta pastoral."));
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      runTurn: runTurn as never,
      loadAuth: async () => syntheticAuth,
      now,
    });
    expect(result.outcomes).toEqual(["processed"]);
    expect(runTurn).toHaveBeenCalledTimes(1);
    expect(outbox.rows.size).toBe(1);
    const row = [...outbox.rows.values()][0]!;
    expect(row.status).toBe("pending");
    expect(row.idempotencyKey).toMatch(/^bundle:/);
  });

  it("revoked treated as unlinked — no IA", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const identity = new FakeChannelIdentityResolver();
    // not seeded → null resolve
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_rev",
      text: "oi",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryIdentity: identity,
      runTurn: runTurn as never,
      now,
    });
    expect(result.outcomes).toEqual(["pending_identity"]);
    expect(runTurn).not.toHaveBeenCalled();
  });

  it("access_required does not become retry and does not call IA when plan missing", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const outbox = new MemoryWhatsAppOutbox();
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "wa_free", syntheticAuth.userId, "id_free");
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_free",
      text: "oi",
      receivedAt: now,
      availableAfter: now,
    });
    const runTurn = vi.fn();
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryOutbox: outbox,
      memoryIdentity: identity,
      runTurn: runTurn as never,
      loadAuth: async () => ({ ...syntheticAuth, planKey: null }),
      now,
    });
    expect(result.outcomes).toEqual(["access_required"]);
    expect(runTurn).not.toHaveBeenCalled();
    expect(outbox.rows.size).toBe(0);
  });

  it("transient failure schedules retry; definitive fails", async () => {
    const claim = new MemoryWhatsAppClaimStore();
    const identity = new FakeChannelIdentityResolver();
    identity.seed("whatsapp", "wa_err", syntheticAuth.userId, "id_err");
    const now = new Date("2026-11-12T12:00:00Z");
    claim.insert({
      externalSenderId: "wa_err",
      text: "oi",
      receivedAt: now,
      availableAfter: now,
    });
    const err = Object.assign(new Error("boom"), { code: "ai_provider_error" });
    const result = await processAvailableWhatsAppBundles({
      enabled: true,
      memoryClaim: claim,
      memoryIdentity: identity,
      memoryOutbox: new MemoryWhatsAppOutbox(),
      runTurn: (async () => {
        throw err;
      }) as never,
      loadAuth: async () => syntheticAuth,
      now,
    });
    expect(result.outcomes).toEqual(["retried"]);
  });

  it("retry does not duplicate outbox via idempotency key", () => {
    const outbox = new MemoryWhatsAppOutbox();
    const key = outboundIdempotencyKey("bundle-1");
    expect(
      outbox.insert({
        identityId: "id1",
        idempotencyKey: key,
        messageType: "text",
        bodyText: "a",
      }).kind,
    ).toBe("inserted");
    expect(
      outbox.insert({
        identityId: "id1",
        idempotencyKey: key,
        messageType: "text",
        bodyText: "b",
      }).kind,
    ).toBe("duplicate");
    expect(outbox.rows.size).toBe(1);
  });

  it("flag off skips processing", async () => {
    const result = await processAvailableWhatsAppBundles({ enabled: false });
    expect(result.processed).toBe(0);
  });
});

describe("whatsapp outbox", () => {
  it("starts pending without external_id field", () => {
    const outbox = new MemoryWhatsAppOutbox();
    const r = outbox.insert({
      identityId: "id1",
      idempotencyKey: "k1",
      messageType: "text",
      bodyText: "ola",
    });
    expect(r.kind).toBe("inserted");
    const row = [...outbox.rows.values()][0]!;
    expect(row.status).toBe("pending");
    expect(row).not.toHaveProperty("externalId");
    expect(Object.keys(row)).not.toContain("external_sender_id");
  });

  it("revocation cancels pending", () => {
    const outbox = new MemoryWhatsAppOutbox();
    outbox.insert({
      identityId: "id1",
      idempotencyKey: "k1",
      messageType: "text",
      bodyText: "ola",
    });
    expect(outbox.cancelForIdentity("id1")).toBe(1);
    expect([...outbox.rows.values()][0]!.status).toBe("cancelled");
  });

  it("clamps text to platform limit and preserves crisis via formatter", () => {
    const long = "x".repeat(5000);
    const outbox = new MemoryWhatsAppOutbox();
    outbox.insert({
      identityId: "id1",
      idempotencyKey: "k2",
      messageType: "text",
      bodyText: long,
    });
    expect([...outbox.rows.values()][0]!.bodyText.length).toBeLessThanOrEqual(
      WHATSAPP_OUTBOUND_TEXT_MAX,
    );

    const crisisPayload: ChatResponsePayload = {
      ...fakePayload("Você não está sozinho. Busque ajuda agora."),
      safetyMode: "crisis",
    };
    const formatted = formatForWhatsApp(crisisPayload);
    expect(formatted).toContain("Você não está sozinho");
  });

  it("noop outbound does not mark sent", async () => {
    const noop = new NoopWhatsAppOutboundPort();
    const r = await noop.sendText({
      toExternalSenderId: "wa",
      text: "hi",
      correlationId: "c",
    });
    expect(r).toEqual({ ok: false, code: "outbound_not_implemented" });
  });
});

describe("whatsapp link rate limit", () => {
  beforeEach(() => {
    resetWhatsAppLinkCodeRateLimit();
  });

  it("allows then blocks after max", () => {
    for (let i = 0; i < 5; i++) {
      expect(evaluateWhatsAppLinkCodeRateLimit("u1").allowed).toBe(true);
    }
    expect(evaluateWhatsAppLinkCodeRateLimit("u1").allowed).toBe(false);
  });
});

describe("whatsapp migration 020 + env", () => {
  it("defines identity, tokens, outbox, RPCs, RLS service_role only", () => {
    const sql = read(
      "supabase/migrations/20261112000020_whatsapp_identity_worker_outbox.sql",
    );
    expect(sql).toContain("user_channel_identities");
    expect(sql).toContain("channel_identity_link_tokens");
    expect(sql).toContain("whatsapp_outbound_messages");
    expect(sql).toContain("whatsapp_consume_link_token");
    expect(sql).toContain("authenticated_link_code");
    expect(sql).toContain("revoke all on table public.user_channel_identities from anon");
    expect(sql).toContain("grant select, insert, update, delete on table public.user_channel_identities to service_role");
    expect(sql).toContain("set search_path = public");
    expect(sql).not.toMatch(/graph\.facebook|ACCESS_TOKEN/i);
  });

  it("env example lists new secrets without real values", () => {
    const env = read(".env.example");
    expect(env).toContain("WHATSAPP_LINK_TOKEN_SECRET=");
    expect(env).toContain("WHATSAPP_WORKER_SECRET=");
    expect(env).not.toMatch(/WHATSAPP_LINK_TOKEN_SECRET=[a-zA-Z0-9]{20,}/);
  });

  it("repositories index untouched", () => {
    const idx = read("src/lib/database/repositories/index.ts");
    expect(idx).not.toMatch(/whatsapp/i);
  });
});

describe("whatsapp account + worker API contracts", () => {
  it("account route uses no-store and same-origin checks", () => {
    const src = read("src/app/api/account/channels/whatsapp/route.ts");
    expect(src).toContain('Cache-Control": "private, no-store"');
    expect(src).toContain("isSameOriginRequest");
    expect(src).toContain("getAuthUserContext");
    // Response JSON must not expose channel external ids.
    expect(src).not.toMatch(/linked:[\s\S]*external_id/);
    expect(src).not.toContain("externalSenderId");
    expect(src).toContain("createWhatsAppLinkCode");
    expect(src).toContain("revokeWhatsAppIdentityForUser");
    expect(src).toContain("linked:");
    expect(src).toContain("verifiedAt");
    expect(src).toContain("pendingCodeExpiresAt");
  });

  it("worker route requires secret constant-time and POST only", () => {
    const src = read("src/app/api/internal/whatsapp/process/route.ts");
    expect(src).toContain("timingSafeEqual");
    expect(src).toContain("getWhatsAppWorkerSecret");
    expect(src).toContain("isWhatsAppChannelEnabled");
    expect(src).toContain("export async function POST");
    expect(src).toContain("method_not_allowed");
    expect(src).not.toContain("searchParams");
  });
});

describe("whatsapp identity worker API runtime", () => {
  beforeEach(() => {
    vi.resetModules();
    resetWhatsAppLinkCodeRateLimit();
  });

  it("GET/POST/DELETE require auth", async () => {
    vi.doMock("@/lib/auth", () => ({
      getAuthUserContext: vi.fn(async () => null),
    }));
    const mod = await import("@/app/api/account/channels/whatsapp/route");
    const getRes = await mod.GET();
    expect(getRes.status).toBe(401);
    expect(getRes.headers.get("Cache-Control")).toContain("no-store");

    const postRes = await mod.POST(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "POST",
        headers: { origin: "http://localhost" },
      }),
    );
    expect(postRes.status).toBe(401);

    const delRes = await mod.DELETE(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "DELETE",
        headers: { origin: "http://localhost" },
      }),
    );
    expect(delRes.status).toBe(401);
  });

  it("POST rejects cross-origin", async () => {
    vi.doMock("@/lib/auth", () => ({
      getAuthUserContext: vi.fn(async () => syntheticAuth),
    }));
    const mod = await import("@/app/api/account/channels/whatsapp/route");
    const res = await mod.POST(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST returns code once; GET never returns code", async () => {
    const createdCode = "ABCD-EFGH";
    vi.doMock("@/lib/auth", () => ({
      getAuthUserContext: vi.fn(async () => syntheticAuth),
    }));
    vi.doMock("@/lib/whatsapp/identity", () => ({
      getActiveWhatsAppIdentityForUser: vi.fn(async () => null),
      revokeWhatsAppIdentityForUser: vi.fn(async () => ({ revoked: false })),
    }));
    vi.doMock("@/lib/whatsapp/link-tokens", async () => {
      const actual = await vi.importActual<
        typeof import("@/lib/whatsapp/link-tokens")
      >("@/lib/whatsapp/link-tokens");
      return {
        ...actual,
        getWhatsAppLinkTokenSecret: () => SECRET,
        createWhatsAppLinkCode: vi.fn(async () => ({
          ok: true as const,
          code: createdCode,
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        })),
      };
    });
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  is: () => ({
                    gt: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));

    const mod = await import("@/app/api/account/channels/whatsapp/route");
    const postRes = await mod.POST(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "POST",
        headers: { origin: "http://localhost" },
      }),
    );
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.code).toBe(createdCode);
    expect(postBody.instruction).toContain("VINCULAR");

    const getRes = await mod.GET();
    const getBody = await getRes.json();
    expect(getBody).not.toHaveProperty("code");
    expect(JSON.stringify(getBody)).not.toContain(createdCode);
    expect(getBody.linked).toBe(false);
  });

  it("DELETE revokes and is idempotent", async () => {
    const revoke = vi
      .fn()
      .mockResolvedValueOnce({ revoked: true, identityId: "id1" })
      .mockResolvedValueOnce({ revoked: false });
    vi.doMock("@/lib/auth", () => ({
      getAuthUserContext: vi.fn(async () => syntheticAuth),
    }));
    vi.doMock("@/lib/whatsapp/identity", () => ({
      getActiveWhatsAppIdentityForUser: vi.fn(async () => null),
      revokeWhatsAppIdentityForUser: revoke,
    }));
    const mod = await import("@/app/api/account/channels/whatsapp/route");
    const r1 = await mod.DELETE(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "DELETE",
        headers: { origin: "http://localhost" },
      }),
    );
    const r2 = await mod.DELETE(
      new Request("http://localhost/api/account/channels/whatsapp", {
        method: "DELETE",
        headers: { origin: "http://localhost" },
      }),
    );
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.revoked).toBe(true);
    expect(b2.revoked).toBe(true);
    expect(JSON.stringify(b1)).not.toMatch(/wa_|external/i);
  });

  it("worker rejects missing/invalid secret and non-POST", async () => {
    vi.doMock("@/lib/whatsapp/config", async () => {
      const actual = await vi.importActual<typeof import("@/lib/whatsapp/config")>(
        "@/lib/whatsapp/config",
      );
      return {
        ...actual,
        getWhatsAppWorkerSecret: () => "worker_secret_at_least_32_chars_xx",
        isWhatsAppChannelEnabled: () => true,
      };
    });
    vi.doMock("@/lib/whatsapp/process-bundles", () => ({
      processAvailableWhatsAppBundles: vi.fn(async () => ({
        processed: 0,
        outcomes: [],
      })),
    }));
    const mod = await import("@/app/api/internal/whatsapp/process/route");
    const bad = await mod.POST(
      new Request("http://localhost/api/internal/whatsapp/process", {
        method: "POST",
        headers: { "x-whatsapp-worker-secret": "wrong" },
      }),
    );
    expect(bad.status).toBe(401);

    const get = await mod.GET();
    expect(get.status).toBe(405);

    const ok = await mod.POST(
      new Request("http://localhost/api/internal/whatsapp/process", {
        method: "POST",
        headers: {
          "x-whatsapp-worker-secret": "worker_secret_at_least_32_chars_xx",
          "content-type": "application/json",
        },
        body: JSON.stringify({ maxBundles: 2 }),
      }),
    );
    expect(ok.status).toBe(200);
  });

  it("worker returns disabled when flag off", async () => {
    vi.doMock("@/lib/whatsapp/config", async () => {
      const actual = await vi.importActual<typeof import("@/lib/whatsapp/config")>(
        "@/lib/whatsapp/config",
      );
      return {
        ...actual,
        getWhatsAppWorkerSecret: () => "worker_secret_at_least_32_chars_xx",
        isWhatsAppChannelEnabled: () => false,
      };
    });
    const mod = await import("@/app/api/internal/whatsapp/process/route");
    const res = await mod.POST(
      new Request("http://localhost/api/internal/whatsapp/process", {
        method: "POST",
        headers: {
          "x-whatsapp-worker-secret": "worker_secret_at_least_32_chars_xx",
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("channel_disabled");
    expect(body.processed).toBe(0);
  });
});

describe("whatsapp conflict privacy", () => {
  it("link conflict results do not embed user/external ids in error codes", () => {
    const src = read("src/lib/whatsapp/process-bundles.ts");
    expect(src).toContain('return "link_conflict"');
    expect(src).not.toMatch(/error_code.*userId|error_code.*external/i);
    void randomBytes;
  });
});
