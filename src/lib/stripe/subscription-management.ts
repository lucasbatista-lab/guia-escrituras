import "server-only";

import type Stripe from "stripe";
import { getAuthUserContext } from "@/lib/auth/session";
import { getEffectiveSubscriptionForUser } from "@/lib/billing/subscription-lookup";
import { getPlanByKey } from "@/lib/entitlements";
import { subscriptionStatusLabel, type SubscriptionStatus } from "@/lib/billing";
import { logger } from "@/lib/logging/logger";
import { createRequestId } from "@/lib/utils";
import { assertStripeConfigured, StripeConfigError } from "./config";
import { getStripeClient } from "./client";

export type SubscriptionManageCode =
  | "unauthenticated"
  | "config_missing"
  | "no_subscription"
  | "manual_subscription"
  | "already_canceling"
  | "not_canceling"
  | "already_canceled"
  | "stripe_error";

export type SubscriptionManageResult =
  | {
      ok: true;
      accessUntilLabel: string;
      message: string;
    }
  | {
      ok: false;
      code: SubscriptionManageCode;
      message: string;
    };

export interface AccountBillingView {
  planName: string;
  priceMonthlyLabel: string;
  statusLabel: string;
  nextChargeLabel: string | null;
  accessUntilLabel: string | null;
  cardLabel: string | null;
  renewsAutomatically: boolean;
  cancelAtPeriodEnd: boolean;
  hasStripeManagedSubscription: boolean;
  isManualOnly: boolean;
  canCancelRenewal: boolean;
  canReactivate: boolean;
}

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDatePtBr(isoOrUnix: string | number | null | undefined): string | null {
  if (isoOrUnix == null) return null;
  const date =
    typeof isoOrUnix === "number"
      ? new Date(isoOrUnix * 1000)
      : new Date(isoOrUnix);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

function redactId(id: string | null | undefined): string | null {
  if (!id) return null;
  return `${id.slice(0, 8)}…`;
}

function cardLabelFromSubscription(sub: Stripe.Subscription): string | null {
  const pm = sub.default_payment_method;
  if (!pm || typeof pm === "string") return null;
  const card = pm.card;
  if (!card?.last4) return null;
  const brand = card.brand
    ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1)
    : "Cartão";
  return `${brand} •••• ${card.last4}`;
}

function periodEndUnix(sub: Stripe.Subscription): number | null {
  const raw = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return typeof raw === "number" ? raw : null;
}

async function requireStripeSubscriptionIdForUser(userId: string): Promise<
  | { ok: true; stripeSubscriptionId: string; periodEndIso: string | null; planName: string }
  | { ok: false; code: SubscriptionManageCode; message: string }
> {
  const effective = await getEffectiveSubscriptionForUser(userId, {
    useAdmin: true,
  });
  if (!effective) {
    return {
      ok: false,
      code: "no_subscription",
      message: "Nenhuma assinatura ativa foi encontrada.",
    };
  }

  const stripeSubscriptionId =
    effective.subscription.stripeSubscriptionId?.trim() ?? null;
  if (!stripeSubscriptionId) {
    return {
      ok: false,
      code: "manual_subscription",
      message:
        "Esta assinatura não está vinculada à cobrança online. Fale com o suporte para alterações.",
    };
  }

  const plan = getPlanByKey(effective.subscription.planKey);
  return {
    ok: true,
    stripeSubscriptionId,
    periodEndIso: effective.subscription.currentPeriodEnd ?? null,
    planName: plan?.name ?? effective.subscription.planKey,
  };
}

/**
 * Account billing presentation — never exposes Stripe IDs to the client.
 * cancel_at_period_end is read live from Stripe (not cached in DB yet).
 */
export async function getAccountBillingView(
  userId: string,
): Promise<AccountBillingView | null> {
  const effective = await getEffectiveSubscriptionForUser(userId, {
    useAdmin: true,
  });
  if (!effective) return null;

  const plan = getPlanByKey(effective.subscription.planKey);
  const localStatus = effective.subscription.status;
  const statusLabel =
    localStatus &&
    ["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].includes(
      localStatus,
    )
      ? subscriptionStatusLabel(localStatus as SubscriptionStatus)
      : localStatus;

  const base: AccountBillingView = {
    planName: plan?.name ?? effective.subscription.planKey,
    priceMonthlyLabel: plan
      ? `${formatBrlCents(plan.priceMonthlyCents)}/mês`
      : "—",
    statusLabel: statusLabel || "—",
    nextChargeLabel: formatDatePtBr(effective.subscription.currentPeriodEnd),
    accessUntilLabel: formatDatePtBr(effective.subscription.currentPeriodEnd),
    cardLabel: null,
    renewsAutomatically: true,
    cancelAtPeriodEnd: false,
    hasStripeManagedSubscription: Boolean(
      effective.subscription.stripeSubscriptionId?.trim(),
    ),
    isManualOnly: !effective.subscription.stripeSubscriptionId?.trim(),
    canCancelRenewal: false,
    canReactivate: false,
  };

  if (!base.hasStripeManagedSubscription) {
    return {
      ...base,
      renewsAutomatically: false,
      statusLabel: statusLabel || "Ativa (manual)",
    };
  }

  try {
    assertStripeConfigured();
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.retrieve(
      effective.subscription.stripeSubscriptionId!,
      { expand: ["default_payment_method"] },
    );

    const endUnix = periodEndUnix(sub);
    const endLabel = formatDatePtBr(endUnix) ?? base.nextChargeLabel;
    const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
    const liveActive = sub.status === "active" || sub.status === "trialing";

    return {
      ...base,
      statusLabel: cancelAtPeriodEnd
        ? "Renovação cancelada"
        : subscriptionStatusLabel(
            (["active", "trialing", "past_due", "canceled", "incomplete", "unpaid"].includes(
              sub.status,
            )
              ? sub.status
              : localStatus) as SubscriptionStatus,
          ) || base.statusLabel,
      nextChargeLabel: cancelAtPeriodEnd ? null : endLabel,
      accessUntilLabel: endLabel,
      cardLabel: cardLabelFromSubscription(sub),
      renewsAutomatically: liveActive && !cancelAtPeriodEnd,
      cancelAtPeriodEnd,
      canCancelRenewal: liveActive && !cancelAtPeriodEnd,
      canReactivate: liveActive && cancelAtPeriodEnd,
    };
  } catch (error) {
    logger.error("account_billing_stripe_lookup_failed", {
      userId,
      err: error instanceof Error ? error.message : "unknown",
      subscriptionIdPrefix: redactId(
        effective.subscription.stripeSubscriptionId,
      ),
    });
    // DB remains authority for access; Stripe extras degrade gracefully.
    return {
      ...base,
      canCancelRenewal: true,
      renewsAutomatically: true,
    };
  }
}

export async function cancelSubscriptionRenewal(): Promise<SubscriptionManageResult> {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para continuar.",
    };
  }

  try {
    assertStripeConfigured();
  } catch (error) {
    return {
      ok: false,
      code: "config_missing",
      message:
        error instanceof StripeConfigError
          ? error.message
          : "Cobrança temporariamente indisponível.",
    };
  }

  const resolved = await requireStripeSubscriptionIdForUser(auth.userId);
  if (!resolved.ok) return resolved;

  try {
    const stripe = getStripeClient();
    const current = await stripe.subscriptions.retrieve(
      resolved.stripeSubscriptionId,
    );

    if (current.status === "canceled") {
      return {
        ok: false,
        code: "already_canceled",
        message: "Esta assinatura já está cancelada.",
      };
    }

    if (current.cancel_at_period_end) {
      return {
        ok: false,
        code: "already_canceling",
        message: "A renovação desta assinatura já está cancelada.",
      };
    }

    // End-of-period only — never cancel immediately.
    const updated = await stripe.subscriptions.update(
      resolved.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    const accessUntilLabel =
      formatDatePtBr(periodEndUnix(updated)) ??
      formatDatePtBr(resolved.periodEndIso) ??
      "o fim do período atual";

    logger.info("subscription_cancel_at_period_end", {
      requestId,
      userId: auth.userId,
      subscriptionIdPrefix: redactId(resolved.stripeSubscriptionId),
      cancelAtPeriodEnd: true,
    });

    return {
      ok: true,
      accessUntilLabel,
      message: `Você continuará com acesso ao plano ${resolved.planName} até ${accessUntilLabel}. Depois dessa data, não haverá uma nova cobrança.`,
    };
  } catch (error) {
    logger.error("subscription_cancel_failed", {
      requestId,
      userId: auth.userId,
      err: error instanceof Error ? error.message : "unknown",
      subscriptionIdPrefix: redactId(resolved.stripeSubscriptionId),
    });
    return {
      ok: false,
      code: "stripe_error",
      message:
        "Não foi possível cancelar a renovação agora. Tente novamente em instantes.",
    };
  }
}

export async function reactivateSubscriptionRenewal(): Promise<SubscriptionManageResult> {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Faça login para continuar.",
    };
  }

  try {
    assertStripeConfigured();
  } catch (error) {
    return {
      ok: false,
      code: "config_missing",
      message:
        error instanceof StripeConfigError
          ? error.message
          : "Cobrança temporariamente indisponível.",
    };
  }

  const resolved = await requireStripeSubscriptionIdForUser(auth.userId);
  if (!resolved.ok) return resolved;

  try {
    const stripe = getStripeClient();
    const current = await stripe.subscriptions.retrieve(
      resolved.stripeSubscriptionId,
    );

    if (current.status === "canceled") {
      return {
        ok: false,
        code: "already_canceled",
        message: "Esta assinatura já está cancelada e não pode ser reativada aqui.",
      };
    }

    if (!current.cancel_at_period_end) {
      return {
        ok: false,
        code: "not_canceling",
        message: "A renovação desta assinatura já está ativa.",
      };
    }

    const updated = await stripe.subscriptions.update(
      resolved.stripeSubscriptionId,
      { cancel_at_period_end: false },
    );

    const accessUntilLabel =
      formatDatePtBr(periodEndUnix(updated)) ??
      formatDatePtBr(resolved.periodEndIso) ??
      "a próxima data de cobrança";

    logger.info("subscription_reactivate_renewal", {
      requestId,
      userId: auth.userId,
      subscriptionIdPrefix: redactId(resolved.stripeSubscriptionId),
      cancelAtPeriodEnd: false,
    });

    return {
      ok: true,
      accessUntilLabel,
      message: `Pronto. Sua assinatura do plano ${resolved.planName} voltará a renovar automaticamente.`,
    };
  } catch (error) {
    logger.error("subscription_reactivate_failed", {
      requestId,
      userId: auth.userId,
      err: error instanceof Error ? error.message : "unknown",
      subscriptionIdPrefix: redactId(resolved.stripeSubscriptionId),
    });
    return {
      ok: false,
      code: "stripe_error",
      message:
        "Não foi possível manter a assinatura agora. Tente novamente em instantes.",
    };
  }
}
