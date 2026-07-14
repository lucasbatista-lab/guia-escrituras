import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertEventMatchesKeyMode,
  InvalidStripeKeyError,
  resolveStripeKeyMode,
  StripeModeMismatchError,
} from "@/lib/stripe/key-mode";
import {
  resolveBillingCustomerId,
  type BillingCustomerStore,
  type StripeCustomerApi,
} from "@/lib/stripe/billing-customer";
import {
  evaluateStripeReadiness,
  validatePriceAgainstCatalog,
} from "@/lib/stripe/readiness";
import { setStripeClientForTests } from "@/lib/stripe/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("stripe key mode", () => {
  it("detects sk_live_ and sk_test_", () => {
    expect(resolveStripeKeyMode("sk_live_abc123")).toBe("live");
    expect(resolveStripeKeyMode("sk_test_abc123")).toBe("test");
  });

  it("rejects invalid key formats", () => {
    expect(() => resolveStripeKeyMode("rk_live_x")).toThrow(InvalidStripeKeyError);
    expect(() => resolveStripeKeyMode("pk_test_x")).toThrow(InvalidStripeKeyError);
    expect(() => resolveStripeKeyMode("")).toThrow(InvalidStripeKeyError);
    expect(() => resolveStripeKeyMode("sk_prod_x")).toThrow(InvalidStripeKeyError);
  });

  it("never embeds raw keys in error messages", () => {
    try {
      resolveStripeKeyMode("sk_unknown_SECRETVALUE");
    } catch (error) {
      expect(String(error)).not.toContain("SECRETVALUE");
      expect(String(error)).not.toContain("sk_unknown_");
    }
  });
});

describe("webhook livemode guard", () => {
  it("accepts live event with live key mode", () => {
    expect(() =>
      assertEventMatchesKeyMode({ livemode: true }, "live"),
    ).not.toThrow();
  });

  it("rejects test event when key is live", () => {
    expect(() =>
      assertEventMatchesKeyMode({ livemode: false }, "live"),
    ).toThrow(StripeModeMismatchError);
  });

  it("rejects live event when key is test", () => {
    expect(() =>
      assertEventMatchesKeyMode({ livemode: true }, "test"),
    ).toThrow(StripeModeMismatchError);
  });

  it("route checks mode before handleStripeWebhookEvent", () => {
    const route = read(
      "src",
      "app",
      "api",
      "webhooks",
      "stripe",
      "route.ts",
    );
    expect(route).toContain("assertEventMatchesKeyMode");
    expect(route).toContain("mode_mismatch");
    expect(route).toContain("constructEvent");
    const postBody = route.slice(route.indexOf("export async function POST"));
    expect(postBody.indexOf("constructEvent")).toBeLessThan(
      postBody.indexOf("assertEventMatchesKeyMode"),
    );
    expect(postBody.indexOf("assertEventMatchesKeyMode")).toBeLessThan(
      postBody.indexOf("handleStripeWebhookEvent(event)"),
    );
  });

  it("does not record payment_event on mode mismatch path", async () => {
    const original = { ...process.env };
    process.env.STRIPE_SECRET_KEY = "sk_live_testkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const recordSpy = vi.fn();
    vi.resetModules();
    vi.doMock("@/lib/stripe/webhook", () => ({
      handleStripeWebhookEvent: vi.fn(async () => {
        recordSpy();
      }),
    }));
    vi.doMock("@/lib/stripe/client", () => ({
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            id: "evt_test_mismatch",
            type: "invoice.paid",
            livemode: false,
            data: { object: {} },
          }),
        },
      }),
      setStripeClientForTests: () => undefined,
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=abc" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("mode_mismatch");
    expect(recordSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(/sk_live|whsec/);

    vi.resetModules();
    vi.doUnmock("@/lib/stripe/webhook");
    vi.doUnmock("@/lib/stripe/client");
    process.env = { ...original };
  });

  it("accepts matching live webhook after signature", async () => {
    const original = { ...process.env };
    process.env.STRIPE_SECRET_KEY = "sk_live_testkey";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const handleSpy = vi.fn(async () => undefined);
    vi.resetModules();
    vi.doMock("@/lib/stripe/webhook", () => ({
      handleStripeWebhookEvent: handleSpy,
    }));
    vi.doMock("@/lib/stripe/client", () => ({
      getStripeClient: () => ({
        webhooks: {
          constructEvent: () => ({
            id: "evt_live_ok",
            type: "invoice.paid",
            livemode: true,
            data: { object: {} },
          }),
        },
      }),
      setStripeClientForTests: () => undefined,
    }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=abc" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(200);
    expect(handleSpy).toHaveBeenCalledTimes(1);

    vi.resetModules();
    vi.doUnmock("@/lib/stripe/webhook");
    vi.doUnmock("@/lib/stripe/client");
    process.env = { ...original };
  });
});

describe("checkout cutover fields", () => {
  it("sets client_reference_id and stripe_mode metadata", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    expect(checkout).toContain("client_reference_id: auth.userId");
    expect(checkout).toContain("stripe_mode:");
    expect(checkout).toContain("subscription_data");
    expect(checkout).toContain("user_id");
    expect(checkout).toContain("plan_key");
    expect(checkout).toContain("signup_intent_id");
  });
});

describe("billing customer remapping", () => {
  function memoryStore(seed?: Record<string, string>): BillingCustomerStore {
    const map = new Map<string, string>(Object.entries(seed ?? {}));
    return {
      async getByUserId(userId) {
        return map.get(userId) ?? null;
      },
      async insert(userId, stripeCustomerId) {
        if (map.has(userId)) return "conflict";
        map.set(userId, stripeCustomerId);
        return "ok";
      },
      async replaceIfMatches(userId, expectedOldId, newId) {
        if (map.get(userId) !== expectedOldId) return "stale";
        map.set(userId, newId);
        return "ok";
      },
    };
  }

  it("reuses a valid existing customer", async () => {
    const create = vi.fn();
    const stripe: StripeCustomerApi = {
      create,
      retrieve: vi.fn(async () => ({ id: "cus_ok", deleted: false })),
    };
    const id = await resolveBillingCustomerId({
      userId: "user-1",
      email: "a@b.com",
      store: memoryStore({ "user-1": "cus_ok" }),
      stripe,
    });
    expect(id).toBe("cus_ok");
    expect(create).not.toHaveBeenCalled();
  });

  it("recreates when customer is missing in current mode", async () => {
    const create = vi.fn(async () => ({ id: "cus_new" }));
    const stripe: StripeCustomerApi = {
      create,
      retrieve: vi.fn(async () => {
        throw { code: "resource_missing", message: "No such customer" };
      }),
    };
    const store = memoryStore({ "user-1": "cus_sandbox" });
    const id = await resolveBillingCustomerId({
      userId: "user-1",
      email: null,
      store,
      stripe,
    });
    expect(id).toBe("cus_new");
    expect(create).toHaveBeenCalledTimes(1);
    expect(await store.getByUserId("user-1")).toBe("cus_new");
  });

  it("interrupts Checkout on non-missing Stripe errors", async () => {
    const stripe: StripeCustomerApi = {
      create: vi.fn(),
      retrieve: vi.fn(async () => {
        throw { code: "api_error", message: "boom" };
      }),
    };
    await expect(
      resolveBillingCustomerId({
        userId: "user-1",
        email: null,
        store: memoryStore({ "user-1": "cus_x" }),
        stripe,
      }),
    ).rejects.toMatchObject({ code: "api_error" });
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it("does not create duplicate customers under concurrency", async () => {
    let creates = 0;
    const store = memoryStore();
    const stripe: StripeCustomerApi = {
      create: vi.fn(async () => {
        creates += 1;
        // Simulate slow create allowing a parallel start.
        await new Promise((r) => setTimeout(r, 5));
        return { id: `cus_${creates}` };
      }),
      retrieve: vi.fn(async (id) => ({ id, deleted: false })),
    };

    // First insert wins; second should hit conflict and reuse.
    const slowInsert: BillingCustomerStore = {
      getByUserId: (id) => store.getByUserId(id),
      async insert(userId, stripeCustomerId) {
        await new Promise((r) => setTimeout(r, 10));
        return store.insert(userId, stripeCustomerId);
      },
      replaceIfMatches: (u, o, n) => store.replaceIfMatches(u, o, n),
    };

    const [a, b] = await Promise.all([
      resolveBillingCustomerId({
        userId: "user-race",
        email: null,
        store: slowInsert,
        stripe,
      }),
      resolveBillingCustomerId({
        userId: "user-race",
        email: null,
        store: slowInsert,
        stripe,
      }),
    ]);

    expect(a).toBe(b);
    const mapped = await store.getByUserId("user-race");
    expect(mapped).toBe(a);
    // At most two creates if both raced before insert; winner still shared.
    expect(creates).toBeLessThanOrEqual(2);
    expect(new Set([a, b]).size).toBe(1);
  });
});

describe("stripe readiness", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    setStripeClientForTests(null);
    vi.restoreAllMocks();
  });

  it("validates catalog amounts currency and recurring", () => {
    expect(
      validatePriceAgainstCatalog("essencial", {
        active: true,
        currency: "brl",
        unit_amount: 3800,
        type: "recurring",
        recurring: { interval: "month" } as never,
      }),
    ).toEqual([]);
    expect(
      validatePriceAgainstCatalog("caminho", {
        active: true,
        currency: "usd",
        unit_amount: 5800,
        type: "recurring",
        recurring: { interval: "month" } as never,
      }),
    ).toContain("currency_not_brl");
    expect(
      validatePriceAgainstCatalog("profundo", {
        active: true,
        currency: "brl",
        unit_amount: 999,
        type: "recurring",
        recurring: { interval: "month" } as never,
      }),
    ).toContain("unit_amount_mismatch");
    expect(
      validatePriceAgainstCatalog("essencial", {
        active: true,
        currency: "brl",
        unit_amount: 3800,
        type: "one_time",
        recurring: null,
      }),
    ).toContain("not_monthly_recurring");
  });

  it("reports ready for correct live prices", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_ok";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
    process.env.STRIPE_PRICE_CAMINHO = "price_caminho_live";
    process.env.STRIPE_PRICE_PROFUNDO = "price_profundo_live";

    const report = await evaluateStripeReadiness({
      retrievePrice: async (id) => {
        const amount =
          id.includes("essencial") ? 3800 : id.includes("caminho") ? 5800 : 18800;
        return {
          id,
          active: true,
          currency: "brl",
          unit_amount: amount,
          type: "recurring",
          recurring: { interval: "month" },
        } as never;
      },
    });

    expect(report.ready).toBe(true);
    expect(report.mode).toBe("live");
    expect(report.webhookConfigured).toBe(true);
    expect(report.plans.essencial.ready).toBe(true);
    expect(JSON.stringify(report)).not.toContain("sk_live_ok");
    expect(JSON.stringify(report)).not.toContain("whsec_ok");
    expect(JSON.stringify(report)).not.toContain("price_essencial_live");
  });

  it("flags missing price in current mode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_ok";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_ok";
    process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial";
    process.env.STRIPE_PRICE_CAMINHO = "price_caminho";
    process.env.STRIPE_PRICE_PROFUNDO = "price_profundo";

    const report = await evaluateStripeReadiness({
      retrievePrice: async () => {
        throw { code: "resource_missing", message: "No such price" };
      },
    });
    expect(report.ready).toBe(false);
    expect(report.mode).toBe("test");
    expect(report.issues.some((i) => i.includes("price_not_found_in_mode"))).toBe(
      true,
    );
    expect(JSON.stringify(report)).not.toContain("price_essencial");
  });

  it("admin readiness route requires admin", () => {
    const route = read(
      "src",
      "app",
      "api",
      "admin",
      "stripe",
      "readiness",
      "route.ts",
    );
    expect(route).toContain("requireAdminUser");
    expect(route).toContain("evaluateStripeReadiness");
  });
});
