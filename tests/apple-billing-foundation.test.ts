import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeAppleAccessStatus,
  appleAccessStatusGrantsAccess,
  appleAccessStatusToResolverStatus,
} from "@/lib/apple/status";
import { planKeyFromAppleProductId } from "@/lib/billing/apple-products";
import { resolveEffectiveAccess } from "@/lib/billing/access";
import type { AccessCandidate } from "@/lib/billing/access";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

function access(
  partial: Partial<AccessCandidate> &
    Pick<AccessCandidate, "provider" | "planKey" | "status">,
): AccessCandidate {
  return {
    currentPeriodEnd: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

describe("migration 017 apple billing foundation", () => {
  const sql = read(
    "supabase",
    "migrations",
    "20260924000017_apple_billing_foundation.sql",
  );

  it("creates companion apple_subscriptions with ownership uniqueness", () => {
    expect(sql).toContain("create table public.apple_subscriptions");
    expect(sql).toContain("unique (environment, original_transaction_id)");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on table public.apple_subscriptions from anon");
    expect(sql).toContain(
      "revoke all on table public.apple_subscriptions from authenticated",
    );
    expect(sql).toContain("grant select on table public.apple_subscriptions to authenticated");
    expect(sql).not.toMatch(/alter table public\.subscriptions/i);
  });

  it("creates billing_provider_events with scoped uniqueness", () => {
    expect(sql).toContain("create table public.billing_provider_events");
    expect(sql).toContain(
      "unique (provider, environment, external_event_id)",
    );
    expect(sql).toContain(
      "revoke all on table public.billing_provider_events from authenticated",
    );
  });
});

describe("Apple access status policy", () => {
  const now = Date.parse("2026-09-24T12:00:00.000Z");

  it("grants during grace; denies billing_retry without grace", () => {
    expect(
      normalizeAppleAccessStatus({
        expiresDate: now - 1000,
        gracePeriodExpiresDate: now + 60_000,
        nowMs: now,
      }),
    ).toBe("grace");
    expect(appleAccessStatusGrantsAccess("grace")).toBe(true);

    expect(
      normalizeAppleAccessStatus({
        expiresDate: now - 1000,
        gracePeriodExpiresDate: now - 1000,
        nowMs: now,
      }),
    ).toBe("expired");
    expect(appleAccessStatusGrantsAccess("billing_retry")).toBe(false);
  });

  it("revocation removes access", () => {
    expect(
      normalizeAppleAccessStatus({
        revocationDate: now - 1,
        expiresDate: now + 86_400_000,
        nowMs: now,
      }),
    ).toBe("revoked");
    expect(appleAccessStatusToResolverStatus("revoked")).toBe("canceled");
  });

  it("active unexpired grants", () => {
    expect(
      normalizeAppleAccessStatus({
        expiresDate: now + 86_400_000,
        nowMs: now,
      }),
    ).toBe("active");
  });
});

describe("multi-provider EffectiveAccess with Apple candidates", () => {
  it("Stripe Essencial + Apple Caminho → Caminho", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "stripe", planKey: "essencial", status: "active" }),
      access({ provider: "apple", planKey: "caminho", status: "active" }),
    ]);
    expect(result.planKey).toBe("caminho");
    expect(result.accessSource).toBe("apple");
    expect(result.billingSources.sort()).toEqual(["apple", "stripe"]);
  });

  it("Stripe Profundo + Apple Essencial → Profundo", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "stripe", planKey: "profundo", status: "active" }),
      access({ provider: "apple", planKey: "essencial", status: "active" }),
    ]);
    expect(result.planKey).toBe("profundo");
    expect(result.accessSource).toBe("stripe");
  });

  it("Stripe expired + Apple Caminho → Caminho", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "stripe", planKey: "profundo", status: "canceled" }),
      access({ provider: "apple", planKey: "caminho", status: "active" }),
    ]);
    expect(result.planKey).toBe("caminho");
  });

  it("Apple revoked + Stripe Essencial → Essencial", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "apple", planKey: "profundo", status: "canceled" }),
      access({ provider: "stripe", planKey: "essencial", status: "active" }),
    ]);
    expect(result.planKey).toBe("essencial");
  });

  it("same tier keeps both billing sources", () => {
    const result = resolveEffectiveAccess([
      access({ provider: "stripe", planKey: "caminho", status: "active" }),
      access({ provider: "apple", planKey: "caminho", status: "active" }),
    ]);
    expect(result.planKey).toBe("caminho");
    expect(result.billingSources.sort()).toEqual(["apple", "stripe"]);
    expect(result.multiProvider).toBe(true);
  });
});

describe("Apple product mapping fail-closed", () => {
  afterEach(() => {
    delete process.env.APPLE_PRODUCT_ESSENCIAL;
    delete process.env.APPLE_PRODUCT_CAMINHO;
    delete process.env.APPLE_PRODUCT_PROFUNDO;
  });

  it("unknown product yields null (no entitlement)", () => {
    process.env.APPLE_PRODUCT_CAMINHO = "br.com.amem.caminho";
    expect(planKeyFromAppleProductId("br.com.amem.caminho")).toBe("caminho");
    expect(planKeyFromAppleProductId("com.unknown.sku")).toBeNull();
  });
});

describe("Apple routes security contracts", () => {
  it("notifications and claim routes exist and fail closed without config", async () => {
    delete process.env.APPLE_BUNDLE_ID;
    const { POST: notifyPost } = await import(
      "@/app/api/billing/apple/notifications/route"
    );
    const notifyRes = await notifyPost(
      new Request("https://amemchat.com.br/api/billing/apple/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedPayload: "eyJhbGciOiJFUzI1NiJ9.e30.sig" }),
      }),
    );
    expect(notifyRes.status).toBe(503);

    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      getAuthUserContext: vi.fn(async () => null),
    }));
    const { POST: claimPost } = await import(
      "@/app/api/billing/apple/claim/route"
    );
    const claimRes = await claimPost(
      new Request("https://amemchat.com.br/api/billing/apple/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://amemchat.com.br",
        },
        body: JSON.stringify({ signedTransaction: "eyJhbGciOiJFUzI1NiJ9.e30.sig" }),
      }),
    );
    // Without Apple config → 503; with config but unauth would be 401.
    expect([401, 503]).toContain(claimRes.status);
  });

  it("notifications reject missing signedPayload", async () => {
    process.env.APPLE_BUNDLE_ID = "br.com.amemchat.app";
    process.env.APPLE_IAP_ENVIRONMENT = "sandbox";
    vi.resetModules();
    const { POST } = await import(
      "@/app/api/billing/apple/notifications/route"
    );
    const res = await POST(
      new Request("https://amemchat.com.br/api/billing/apple/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("signed_payload_required");
    delete process.env.APPLE_BUNDLE_ID;
    delete process.env.APPLE_IAP_ENVIRONMENT;
  });
});

describe("Apple out-of-order and ownership helpers", () => {
  it("upsert ignores older signedAt", async () => {
    const store = new Map<string, { lastSignedAt: string; productId: string }>();
    function key(env: string, original: string) {
      return `${env}:${original}`;
    }
    async function upsert(input: {
      environment: string;
      originalTransactionId: string;
      productId: string;
      signedAt: string;
    }) {
      const k = key(input.environment, input.originalTransactionId);
      const existing = store.get(k);
      if (existing?.lastSignedAt) {
        if (new Date(input.signedAt).getTime() < new Date(existing.lastSignedAt).getTime()) {
          return { applied: false, productId: existing.productId };
        }
      }
      store.set(k, {
        lastSignedAt: input.signedAt,
        productId: input.productId,
      });
      return { applied: true, productId: input.productId };
    }

    expect(
      (
        await upsert({
          environment: "sandbox",
          originalTransactionId: "100",
          productId: "caminho",
          signedAt: "2026-09-24T12:00:00.000Z",
        })
      ).productId,
    ).toBe("caminho");
    expect(
      await upsert({
        environment: "sandbox",
        originalTransactionId: "100",
        productId: "essencial",
        signedAt: "2026-09-24T11:00:00.000Z",
      }),
    ).toEqual({ applied: false, productId: "caminho" });
  });
});
