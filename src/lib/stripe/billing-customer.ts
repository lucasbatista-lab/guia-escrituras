import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "./client";
import { logger } from "@/lib/logging/logger";

export type BillingCustomerStore = {
  getByUserId(userId: string): Promise<string | null>;
  /** Insert mapping; returns conflict when another writer won the race. */
  insert(userId: string, stripeCustomerId: string): Promise<"ok" | "conflict">;
  /** Conditional replace; stale when expectedOldId no longer matches. */
  replaceIfMatches(
    userId: string,
    expectedOldId: string,
    newStripeCustomerId: string,
  ): Promise<"ok" | "stale">;
};

export type StripeCustomerApi = {
  create(input: {
    email?: string;
    metadata: { user_id: string };
  }): Promise<{ id: string }>;
  retrieve(customerId: string): Promise<{ id: string; deleted?: boolean }>;
};

export function isStripeResourceMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "resource_missing") return true;
  if (typeof err.message !== "string") return false;
  return (
    /no such customer/i.test(err.message) ||
    /no such checkout\.session/i.test(err.message) ||
    /no such price/i.test(err.message)
  );
}

/**
 * Resolve a Customer ID usable with the currently configured Stripe key.
 * Recreates mapping when a sandbox/other-mode customer is missing.
 * Concurrent callers share one mapping via conditional insert/replace.
 */
export async function resolveBillingCustomerId(input: {
  userId: string;
  email: string | null;
  store: BillingCustomerStore;
  stripe: StripeCustomerApi;
}): Promise<string> {
  const { userId, email, store, stripe } = input;

  const existingId = await store.getByUserId(userId);
  if (existingId) {
    return ensureCustomerUsable({
      userId,
      email,
      mappedId: existingId,
      store,
      stripe,
    });
  }

  return createAndPersistCustomer({ userId, email, store, stripe });
}

async function ensureCustomerUsable(input: {
  userId: string;
  email: string | null;
  mappedId: string;
  store: BillingCustomerStore;
  stripe: StripeCustomerApi;
}): Promise<string> {
  const { userId, email, mappedId, store, stripe } = input;

  try {
    const customer = await stripe.retrieve(mappedId);
    if (!customer.deleted) {
      return mappedId;
    }
  } catch (error) {
    if (!isStripeResourceMissing(error)) {
      throw error;
    }
  }

  const created = await stripe.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });

  const replace = await store.replaceIfMatches(userId, mappedId, created.id);
  if (replace === "ok") {
    logger.info("stripe_billing_customer_remapped", {
      userId,
      reason: "resource_missing_or_deleted",
    });
    return created.id;
  }

  // Another request remapped first — reuse the winner after validation.
  const winner = await store.getByUserId(userId);
  if (!winner) {
    return createAndPersistCustomer({ userId, email, store, stripe });
  }
  if (winner === created.id) return created.id;

  try {
    const customer = await stripe.retrieve(winner);
    if (!customer.deleted) return winner;
  } catch (error) {
    if (!isStripeResourceMissing(error)) throw error;
  }

  return createAndPersistCustomer({ userId, email, store, stripe });
}

async function createAndPersistCustomer(input: {
  userId: string;
  email: string | null;
  store: BillingCustomerStore;
  stripe: StripeCustomerApi;
}): Promise<string> {
  const { userId, email, store, stripe } = input;

  // Re-check before create to minimize duplicate Stripe customers.
  const raced = await store.getByUserId(userId);
  if (raced) {
    return ensureCustomerUsable({
      userId,
      email,
      mappedId: raced,
      store,
      stripe,
    });
  }

  const created = await stripe.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });

  const insert = await store.insert(userId, created.id);
  if (insert === "ok") return created.id;

  const winner = await store.getByUserId(userId);
  if (winner) {
    try {
      const customer = await stripe.retrieve(winner);
      if (!customer.deleted) return winner;
    } catch (error) {
      if (!isStripeResourceMissing(error)) throw error;
    }
    return ensureCustomerUsable({
      userId,
      email,
      mappedId: winner,
      store,
      stripe,
    });
  }

  // Extremely rare: conflict without readable row — surface error.
  throw new Error("billing_customer_mapping_conflict");
}

function createSupabaseBillingCustomerStore(): BillingCustomerStore {
  return {
    async getByUserId(userId) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.stripe_customer_id ?? null;
    },

    async insert(userId, stripeCustomerId) {
      const admin = createAdminClient();
      const { error } = await admin.from("billing_customers").insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
      });
      if (!error) return "ok";
      // Unique conflict on user_id or stripe_customer_id.
      return "conflict";
    },

    async replaceIfMatches(userId, expectedOldId, newStripeCustomerId) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("billing_customers")
        .update({ stripe_customer_id: newStripeCustomerId })
        .eq("user_id", userId)
        .eq("stripe_customer_id", expectedOldId)
        .select("user_id");
      if (error) throw error;
      if (data && data.length > 0) return "ok";
      return "stale";
    },
  };
}

function stripeCustomerApiFromClient(): StripeCustomerApi {
  const stripe = getStripeClient();
  return {
    async create(input) {
      const customer = await stripe.customers.create(input);
      return { id: customer.id };
    },
    async retrieve(customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return { id: customer.id, deleted: true };
      }
      return { id: customer.id, deleted: false };
    },
  };
}

/** Production entry: validate existing mapping against current Stripe mode. */
export async function getOrCreateBillingCustomer(
  userId: string,
  email: string | null,
): Promise<string> {
  return resolveBillingCustomerId({
    userId,
    email,
    store: createSupabaseBillingCustomerStore(),
    stripe: stripeCustomerApiFromClient(),
  });
}
