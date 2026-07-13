"use server";

import { redirect } from "next/navigation";
import { getPrivacyVersion, getTermsVersion } from "@/config/legal";
import { getAuthUserContext } from "@/lib/auth/session";
import {
  createSignupIntentWithToken,
  SignupIntentConfigError,
  validateCheckoutPlan,
  type SignupTrackingParams,
} from "@/lib/signup-intents";
import { createRequestId } from "@/lib/utils";
import { logger } from "@/lib/logging/logger";

export async function startPlanContinuationAction(input: {
  planKey: string;
  tracking?: SignupTrackingParams;
}): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; code: "unauthenticated" | "invalid_plan" | "config_missing" }
> {
  const requestId = createRequestId();
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) {
    return { ok: false, code: "unauthenticated" };
  }

  const plan = validateCheckoutPlan(input.planKey);
  if (!plan.ok) {
    return { ok: false, code: "invalid_plan" };
  }

  try {
    const { token } = await createSignupIntentWithToken({
      selectedPlanKey: plan.planKey,
      userId: auth.userId,
      tracking: input.tracking,
      termsVersion: getTermsVersion(),
      privacyVersion: getPrivacyVersion(),
      termsAcceptedAt: new Date().toISOString(),
    });

    logger.info("plan_continuation_started", {
      requestId,
      userId: auth.userId,
      planKey: plan.planKey,
    });

    return {
      ok: true,
      redirectTo: `/assinar/continuar?intent=${encodeURIComponent(token)}`,
    };
  } catch (error) {
    if (error instanceof SignupIntentConfigError) {
      return { ok: false, code: "config_missing" };
    }
    logger.error("plan_continuation_failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}

export async function redirectAuthenticatedPlanSelection(
  planKey: string | null,
  tracking?: SignupTrackingParams,
): Promise<void> {
  if (!planKey) return;
  const auth = await getAuthUserContext();
  if (!auth || auth.demoMode) return;

  const result = await startPlanContinuationAction({ planKey, tracking });
  if (result.ok) {
    redirect(result.redirectTo);
  }
}
