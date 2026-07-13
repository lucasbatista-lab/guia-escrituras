"use server";

import {
  cancelSubscriptionRenewal,
  reactivateSubscriptionRenewal,
  type SubscriptionManageResult,
} from "@/lib/stripe/subscription-management";

/** Client must not send subscription IDs — server resolves the effective one. */
export async function cancelSubscriptionRenewalAction(): Promise<SubscriptionManageResult> {
  return cancelSubscriptionRenewal();
}

export async function reactivateSubscriptionRenewalAction(): Promise<SubscriptionManageResult> {
  return reactivateSubscriptionRenewal();
}
