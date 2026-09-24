import "server-only";

import type Stripe from "stripe";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { maskStripeId, maskUserId } from "@/lib/logging/mask";
import { logger } from "@/lib/logging/logger";
import { assertStripeConfigured, StripeConfigError } from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/client";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account/account-deletion-constants";
import {
  appleRecurringBillingStopPort,
  composeRecurringBillingStops,
  type RecurringBillingStopPort,
} from "@/lib/billing/recurring-billing-stop";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRequestId } from "@/lib/utils";

export { ACCOUNT_DELETE_CONFIRMATION };

export type AccountDeleteErrorCode =
  | "unauthenticated"
  | "confirmation_required"
  | "forbidden"
  | "subscription_cancel_failed"
  | "deletion_failed"
  | "demo_mode_forbidden";

export type AccountDeleteResult =
  | { ok: true; requestId: string }
  | {
      ok: false;
      code: AccountDeleteErrorCode;
      message: string;
      requestId: string;
    };

export type AccountDeleteBillingOutcome =
  | { ok: true; stoppedCount: number; alreadyStoppedCount: number }
  | {
      ok: false;
      code: "subscription_cancel_failed";
      message: string;
    };

const RECURRING_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

type AdminAuthDelete = {
  auth: {
    admin: {
      deleteUser: (
        id: string,
      ) => Promise<{ data: unknown; error: { message?: string; status?: number } | null }>;
    };
  };
  from: (table: string) => {
    delete: () => {
      or: (
        filter: string,
      ) => Promise<{ error: { message?: string } | null }>;
    };
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: { stripe_customer_id?: string } | null;
          error: unknown;
        }>;
      };
    };
  };
};

let adminClientFactoryForTests: (() => AdminAuthDelete) | null = null;
let billingStopForTests:
  | ((userId: string) => Promise<AccountDeleteBillingOutcome>)
  | null = null;

/** Test seam — never used in production. */
export function setAccountDeletionAdminClientForTests(
  factory: (() => AdminAuthDelete) | null,
): void {
  adminClientFactoryForTests = factory;
}

/** Test seam — never used in production. */
export function setAccountDeletionBillingStopForTests(
  fn: ((userId: string) => Promise<AccountDeleteBillingOutcome>) | null,
): void {
  billingStopForTests = fn;
}

function getAdmin(): AdminAuthDelete {
  if (adminClientFactoryForTests) return adminClientFactoryForTests();
  return createAdminClient() as unknown as AdminAuthDelete;
}

function isAuthUserMissingError(error: {
  message?: string;
  status?: number;
}): boolean {
  const status = error.status;
  if (status === 404) return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("user not found") ||
    message.includes("not found") ||
    message.includes("does not exist")
  );
}

/**
 * Stop recurring Stripe billing for every linked subscription before Auth wipe.
 * Reuses the product canonical: cancel_at_period_end (no immediate cancel, no refund).
 * Idempotent for already-canceled / already cancel_at_period_end.
 */
export async function ensureRecurringBillingStoppedForDeletion(
  userId: string,
): Promise<AccountDeleteBillingOutcome> {
  if (billingStopForTests) return billingStopForTests(userId);

  const localRows = await loadUserSubscriptions(userId, { useAdmin: true });
  const stripeIds = new Set<string>();

  for (const row of localRows) {
    const id = row.stripeSubscriptionId?.trim();
    if (!id) continue;
    if (String(row.status).toLowerCase() === "canceled") continue;
    stripeIds.add(id);
  }

  let stripeCustomerId: string | null = null;
  try {
    const admin = getAdmin();
    const { data } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    stripeCustomerId = data?.stripe_customer_id?.trim() || null;
  } catch {
    stripeCustomerId = null;
  }

  if (stripeIds.size === 0 && !stripeCustomerId) {
    return { ok: true, stoppedCount: 0, alreadyStoppedCount: 0 };
  }

  try {
    assertStripeConfigured();
  } catch (error) {
    return {
      ok: false,
      code: "subscription_cancel_failed",
      message:
        error instanceof StripeConfigError
          ? "Não foi possível confirmar o cancelamento da assinatura agora. Tente novamente em instantes."
          : "Não foi possível confirmar o cancelamento da assinatura agora. Tente novamente em instantes.",
    };
  }

  const stripe = getStripeClient();

  if (stripeCustomerId) {
    try {
      const listed = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
      });
      for (const sub of listed.data) {
        if (RECURRING_STRIPE_STATUSES.has(sub.status)) {
          stripeIds.add(sub.id);
        }
      }
    } catch (error) {
      logger.error("account_delete_stripe_list_failed", {
        userId: maskUserId(userId),
        customerIdPrefix: maskStripeId(stripeCustomerId),
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        ok: false,
        code: "subscription_cancel_failed",
        message:
          "Não foi possível verificar sua assinatura agora. A conta não foi excluída. Tente novamente em instantes.",
      };
    }
  }

  let stoppedCount = 0;
  let alreadyStoppedCount = 0;

  for (const subscriptionId of stripeIds) {
    try {
      const current = await stripe.subscriptions.retrieve(subscriptionId);

      if (current.status === "canceled") {
        alreadyStoppedCount += 1;
        continue;
      }

      if (current.cancel_at_period_end) {
        alreadyStoppedCount += 1;
        continue;
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      stoppedCount += 1;
    } catch (error) {
      logger.error("account_delete_subscription_stop_failed", {
        userId: maskUserId(userId),
        subscriptionIdPrefix: maskStripeId(subscriptionId),
        err: error instanceof Error ? error.message : "unknown",
      });
      return {
        ok: false,
        code: "subscription_cancel_failed",
        message:
          "Não foi possível cancelar a renovação da assinatura. A conta não foi excluída. Tente novamente em instantes.",
      };
    }
  }

  return { ok: true, stoppedCount, alreadyStoppedCount };
}

/**
 * referral_attributions FKs are NO ACTION — must clear before Auth/profile delete.
 * referral_rewards cascade from attribution_id.
 */
export async function purgeReferralEdgesForUser(
  userId: string,
  admin: AdminAuthDelete = getAdmin(),
): Promise<void> {
  const { error } = await admin
    .from("referral_attributions")
    .delete()
    .or(`referrer_user_id.eq.${userId},referred_user_id.eq.${userId}`);

  if (error) {
    throw new Error(error.message ?? "referral_purge_failed");
  }
}

/**
 * Self-service account deletion for the authenticated session user only.
 * Never accepts client-supplied userId/email as authority.
 */
export async function deleteAuthenticatedAccount(input: {
  userId: string;
  confirmation: string;
  requestId?: string;
}): Promise<AccountDeleteResult> {
  const requestId = input.requestId ?? createRequestId();
  const confirmation = input.confirmation.trim();

  if (confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    return {
      ok: false,
      code: "confirmation_required",
      message: `Digite ${ACCOUNT_DELETE_CONFIRMATION} para confirmar a exclusão.`,
      requestId,
    };
  }

  const userId = input.userId;

  const stripePort: RecurringBillingStopPort = {
    stopForUser: ensureRecurringBillingStoppedForDeletion,
  };
  // Apple port: detects grants; does not pretend StoreKit cancel == Stripe cancel.
  const billing = await composeRecurringBillingStops(userId, [
    stripePort,
    appleRecurringBillingStopPort,
  ]);
  if (!billing.ok) {
    logger.warn("account_delete_blocked_billing", {
      requestId,
      userId: maskUserId(userId),
      code: billing.code,
    });
    return {
      ok: false,
      code: "subscription_cancel_failed",
      message: billing.message,
      requestId,
    };
  }

  try {
    const admin = getAdmin();
    await purgeReferralEdgesForUser(userId, admin);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      if (isAuthUserMissingError(error)) {
        // Idempotent: Auth already gone after a prior success / race.
        logger.info("account_delete_auth_already_absent", {
          requestId,
          userId: maskUserId(userId),
        });
        return { ok: true, requestId };
      }
      logger.error("account_delete_auth_failed", {
        requestId,
        userId: maskUserId(userId),
        err: error.message ?? "unknown",
      });
      return {
        ok: false,
        code: "deletion_failed",
        message:
          "Não foi possível excluir a conta agora. Tente novamente em instantes.",
        requestId,
      };
    }
  } catch (error) {
    logger.error("account_delete_failed", {
      requestId,
      userId: maskUserId(userId),
      err: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      code: "deletion_failed",
      message:
        "Não foi possível excluir a conta agora. Tente novamente em instantes.",
      requestId,
    };
  }

  logger.info("account_delete_succeeded", {
    requestId,
    userId: maskUserId(userId),
    billingStopped: billing.stoppedCount,
    billingAlreadyStopped: billing.alreadyStoppedCount,
  });

  return { ok: true, requestId };
}

/** Narrow Stripe surface used only in unit tests for call-order assertions. */
export type AccountDeletionStripeTestSurface = Pick<
  Stripe,
  "subscriptions"
>;
