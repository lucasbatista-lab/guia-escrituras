import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotEnv, restoreEnv } from "./helpers/env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  claimPaymentEvent,
  PAYMENT_EVENT_LEASE_MS,
  PAYMENT_EVENT_MAX_ATTEMPTS,
  type PaymentEventClaimStore,
  type PaymentEventRow,
} from "@/lib/stripe/payment-event-claim";
import {
  extractStripeCustomerId,
  extractStripePriceId,
  planKeyFromConfiguredPriceId,
  resolvePlanKeyFromPriceAndMetadata,
  resolveUserIdForStripeCustomer,
  WebhookBindingError,
} from "@/lib/stripe/webhook-binding";
import { maskStripeId, maskUserId } from "@/lib/logging/mask";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const originalEnv = snapshotEnv();

beforeEach(() => {
  restoreEnv(originalEnv);
  process.env.STRIPE_PRICE_ESSENCIAL = "price_essencial_live";
  process.env.STRIPE_PRICE_CAMINHO = "price_caminho_live";
  process.env.STRIPE_PRICE_PROFUNDO = "price_profundo_live";
});

afterEach(() => {
  restoreEnv(originalEnv);
  vi.restoreAllMocks();
});

function memoryClaimStore(clock: { nowMs: number }): PaymentEventClaimStore & {
  byProvider: Map<string, PaymentEventRow>;
} {
  const byProvider = new Map<string, PaymentEventRow>();

  return {
    byProvider,
    async getByProviderEventId(providerEventId) {
      const row = byProvider.get(providerEventId);
      return row ? { ...row } : null;
    },
    async insertReceived(input) {
      if (byProvider.has(input.providerEventId)) return "conflict";
      byProvider.set(input.providerEventId, {
        id: `row_${byProvider.size + 1}`,
        processing_status: "received",
        attempt_count: 0,
        updated_at: new Date(clock.nowMs).toISOString(),
      });
      return "ok";
    },
    async claimFailed(input) {
      for (const row of byProvider.values()) {
        if (row.id !== input.id) continue;
        if (row.processing_status !== "failed") return false;
        row.processing_status = "received";
        row.attempt_count = input.nextAttemptCount;
        row.updated_at = new Date(clock.nowMs).toISOString();
        return true;
      }
      return false;
    },
    async claimStaleReceived(input) {
      for (const row of byProvider.values()) {
        if (row.id !== input.id) continue;
        if (row.processing_status !== "received") return false;
        if (!(row.updated_at < input.cutoffIso)) return false;
        row.attempt_count = input.nextAttemptCount;
        row.updated_at = new Date(clock.nowMs).toISOString();
        return true;
      }
      return false;
    },
    async markExhausted(providerEventId) {
      const row = byProvider.get(providerEventId);
      if (!row) return;
      row.processing_status = "failed";
    },
  };
}

describe("payment event claim / lease", () => {
  it("claims a new event for processing", async () => {
    const clock = { nowMs: 1_000_000 };
    const store = memoryClaimStore(clock);
    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_new_1",
          eventType: "customer.subscription.updated",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("claimed");
  });

  it("ignores already processed events (idempotent)", async () => {
    const clock = { nowMs: 1_000_000 };
    const store = memoryClaimStore(clock);
    await store.insertReceived({
      providerEventId: "evt_done",
      eventType: "invoice.paid",
      objectId: null,
    });
    store.byProvider.get("evt_done")!.processing_status = "processed";

    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_done",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("duplicate");
  });

  it("does not double-process a fresh received event", async () => {
    const clock = { nowMs: 1_000_000 };
    const store = memoryClaimStore(clock);
    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_live",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("claimed");

    clock.nowMs = 1_000_000 + 30_000;
    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_live",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
          leaseMs: PAYMENT_EVENT_LEASE_MS,
        },
        store,
      ),
    ).resolves.toBe("in_flight");
  });

  it("reclaims a stale received event after the lease", async () => {
    const clock = { nowMs: 1_000_000 };
    const store = memoryClaimStore(clock);
    await claimPaymentEvent(
      {
        providerEventId: "evt_stale",
        eventType: "invoice.paid",
        nowMs: clock.nowMs,
      },
      store,
    );

    clock.nowMs = 1_000_000 + PAYMENT_EVENT_LEASE_MS + 1;
    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_stale",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("claimed");
    expect(store.byProvider.get("evt_stale")!.attempt_count).toBe(1);
  });

  it("allows only one winner on concurrent stale reclaim", async () => {
    const clock = { nowMs: 1_000_000 };
    const store = memoryClaimStore(clock);
    await claimPaymentEvent(
      {
        providerEventId: "evt_race",
        eventType: "invoice.paid",
        nowMs: clock.nowMs,
      },
      store,
    );

    clock.nowMs = 1_000_000 + PAYMENT_EVENT_LEASE_MS + 5_000;
    const first = await claimPaymentEvent(
      {
        providerEventId: "evt_race",
        eventType: "invoice.paid",
        nowMs: clock.nowMs,
      },
      store,
    );
    const second = await claimPaymentEvent(
      {
        providerEventId: "evt_race",
        eventType: "invoice.paid",
        nowMs: clock.nowMs,
      },
      store,
    );
    expect(first).toBe("claimed");
    expect(second).toBe("in_flight");
  });

  it("retakes failed events", async () => {
    const clock = { nowMs: 2_000_000 };
    const store = memoryClaimStore(clock);
    await store.insertReceived({
      providerEventId: "evt_fail",
      eventType: "invoice.paid",
      objectId: null,
    });
    const row = store.byProvider.get("evt_fail")!;
    row.processing_status = "failed";
    row.attempt_count = 2;

    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_fail",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("claimed");
    expect(row.processing_status).toBe("received");
    expect(row.attempt_count).toBe(3);
  });

  it("exhausts after max attempts", async () => {
    const clock = { nowMs: 3_000_000 };
    const store = memoryClaimStore(clock);
    await store.insertReceived({
      providerEventId: "evt_max",
      eventType: "invoice.paid",
      objectId: null,
    });
    const row = store.byProvider.get("evt_max")!;
    row.processing_status = "failed";
    row.attempt_count = PAYMENT_EVENT_MAX_ATTEMPTS;

    await expect(
      claimPaymentEvent(
        {
          providerEventId: "evt_max",
          eventType: "invoice.paid",
          nowMs: clock.nowMs,
        },
        store,
      ),
    ).resolves.toBe("exhausted");
    expect(row.processing_status).toBe("failed");
  });
});

describe("webhook customer ↔ user binding", () => {
  it("resolves user from billing_customers mapping", async () => {
    await expect(
      resolveUserIdForStripeCustomer({
        customerId: "cus_mapped_abc",
        metadataUserId: "user-1",
        lookupUserIdByCustomerId: async () => "user-1",
      }),
    ).resolves.toBe("user-1");
  });

  it("allows missing metadata when Customer is mapped", async () => {
    await expect(
      resolveUserIdForStripeCustomer({
        customerId: "cus_mapped_abc",
        metadataUserId: null,
        lookupUserIdByCustomerId: async () => "user-1",
      }),
    ).resolves.toBe("user-1");
  });

  it("rejects divergent metadata.user_id", async () => {
    await expect(
      resolveUserIdForStripeCustomer({
        customerId: "cus_mapped_abc",
        metadataUserId: "user-other",
        lookupUserIdByCustomerId: async () => "user-1",
      }),
    ).rejects.toMatchObject({ code: "user_mismatch" });
  });

  it("rejects unknown Customer", async () => {
    await expect(
      resolveUserIdForStripeCustomer({
        customerId: "cus_unknown",
        metadataUserId: "user-1",
        lookupUserIdByCustomerId: async () => null,
      }),
    ).rejects.toMatchObject({ code: "customer_unmapped", retryable: true });
  });

  it("rejects missing Customer", async () => {
    await expect(
      resolveUserIdForStripeCustomer({
        customerId: null,
        lookupUserIdByCustomerId: async () => "user-1",
      }),
    ).rejects.toBeInstanceOf(WebhookBindingError);
  });
});

describe("webhook Price ↔ plan_key", () => {
  it("resolves plan from configured Price catalog", () => {
    expect(planKeyFromConfiguredPriceId("price_essencial_live")).toBe(
      "essencial",
    );
    expect(
      resolvePlanKeyFromPriceAndMetadata({
        priceId: "price_essencial_live",
        metadataPlanKey: "essencial",
      }),
    ).toBe("essencial");
  });

  it("accepts valid Price when metadata plan_key is absent", () => {
    expect(
      resolvePlanKeyFromPriceAndMetadata({
        priceId: "price_caminho_live",
        metadataPlanKey: null,
      }),
    ).toBe("caminho");
  });

  it("rejects Price vs metadata plan_key mismatch", () => {
    expect(() =>
      resolvePlanKeyFromPriceAndMetadata({
        priceId: "price_essencial_live",
        metadataPlanKey: "profundo",
      }),
    ).toThrow(WebhookBindingError);
  });

  it("rejects when Price cannot be resolved from catalog", () => {
    expect(() =>
      resolvePlanKeyFromPriceAndMetadata({
        priceId: null,
        metadataPlanKey: "essencial",
      }),
    ).toThrow(WebhookBindingError);

    try {
      resolvePlanKeyFromPriceAndMetadata({
        priceId: "price_unknown",
        metadataPlanKey: null,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: "plan_unresolved" });
    }
  });

  it("extracts customer and price ids safely", () => {
    expect(extractStripeCustomerId("cus_abc")).toBe("cus_abc");
    expect(extractStripeCustomerId({ id: "cus_abc" })).toBe("cus_abc");
    expect(extractStripePriceId("price_abc")).toBe("price_abc");
    expect(extractStripePriceId({ id: "price_abc" })).toBe("price_abc");
  });
});

describe("webhook hardening contracts", () => {
  it("route does not ACK in_flight or recoverable processing failures", () => {
    const route = read(
      "src",
      "app",
      "api",
      "webhooks",
      "stripe",
      "route.ts",
    );
    expect(route).toContain('result === "in_flight"');
    expect(route).toContain("409");
    expect(route).toContain("processing_failed");
    expect(route).toContain("500");
  });

  it("subscription upsert binds Customer and validates Price", () => {
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    expect(webhook).toContain("resolveUserIdForStripeCustomer");
    expect(webhook).toContain("resolvePlanKeyFromPriceAndMetadata");
    expect(webhook).toContain('.eq("user_id", userId)');
    expect(webhook).toContain("WebhookBindingError");
  });

  it("intent update requires matching user_id", () => {
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    expect(webhook).toContain("signup_intents");
    expect(webhook).toContain('.eq("id", intentId)');
    expect(webhook).toContain('.eq("user_id", userId)');
  });

  it("logs stay sanitized (no full Stripe ids or emails)", () => {
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    expect(webhook).toContain("maskStripeId");
    expect(webhook).toContain("maskUserId");
    expect(webhook).not.toContain("customerId: customerId");
    expect(webhook).not.toContain("email:");
    expect(maskStripeId("cus_abcdefghijklmnop")).toMatch(/^cus_abcd/);
    expect(maskUserId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "usr_aaaaaaaa",
    );
  });

  it("does not hit the network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    extractStripeCustomerId("cus_x");
    planKeyFromConfiguredPriceId("price_essencial_live");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
