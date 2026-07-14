import "server-only";

import { getAuthUserContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isActiveSubscription } from "@/lib/billing";
import {
  isStripeCheckoutSessionId,
  readCheckoutReturnCookie,
  setCheckoutReturnCookie,
  clearCheckoutReturnCookie,
} from "@/lib/billing/checkout-return-cookie";
import { getStripeClient } from "@/lib/stripe/client";
import { assertStripeConfigured } from "@/lib/stripe/config";

export type CheckoutSuccessView =
  | { kind: "unauthenticated"; resumePath: string }
  | { kind: "forbidden" }
  | { kind: "processing" }
  | { kind: "sync_error" }
  | {
      kind: "active";
      nextPath: "/personalizar" | "/inicio";
    };

/**
 * Resolve the post-Checkout success state.
 * Authority for "active" is the DB subscription (webhook), not the URL alone.
 * Never creates a Supabase session from Stripe data.
 */
export async function resolveCheckoutSuccessState(options?: {
  sessionIdFromQuery?: string | null;
}): Promise<CheckoutSuccessView> {
  const auth = await getAuthUserContext();
  const queryId = options?.sessionIdFromQuery?.trim() || null;
  const cookieId = await readCheckoutReturnCookie();
  const sessionId =
    (queryId && isStripeCheckoutSessionId(queryId) ? queryId : null) ||
    cookieId;

  if (sessionId) {
    await setCheckoutReturnCookie(sessionId);
  }

  if (!auth || auth.demoMode) {
    return {
      kind: "unauthenticated",
      resumePath: "/entrar?next=/assinatura/sucesso",
    };
  }

  if (!sessionId) {
    // Authenticated return without session_id: still wait on DB if webhook finished.
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status")
      .eq("user_id", auth.userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub && isActiveSubscription(sub.status as "active" | "trialing")) {
      await clearCheckoutReturnCookie();
      const nextPath = auth.spiritualProfile.onboardingCompleted
        ? "/inicio"
        : "/personalizar";
      return { kind: "active", nextPath };
    }
    return { kind: "processing" };
  }

  try {
    assertStripeConfigured();
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.metadata?.user_id;

    if (sessionUserId && sessionUserId !== auth.userId) {
      return { kind: "forbidden" };
    }

    const paymentLooksDone =
      session.payment_status === "paid" || session.status === "complete";

    if (!paymentLooksDone && sessionUserId && sessionUserId !== auth.userId) {
      return { kind: "forbidden" };
    }

    // DB is the authority for unlocking the product.
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub && isActiveSubscription(sub.status as "active" | "trialing")) {
      await clearCheckoutReturnCookie();
      const nextPath = auth.spiritualProfile.onboardingCompleted
        ? "/inicio"
        : "/personalizar";
      return { kind: "active", nextPath };
    }

    // Paid at Stripe but webhook not reflected yet — keep user on success page.
    if (
      paymentLooksDone &&
      (!sessionUserId || sessionUserId === auth.userId)
    ) {
      return { kind: "processing" };
    }

    return { kind: "processing" };
  } catch {
    return { kind: "sync_error" };
  }
}

/** Lightweight poll payload — never includes Stripe ids or secrets. */
export async function getCheckoutSuccessPollPayload(): Promise<{
  status: "processing" | "active" | "forbidden" | "unauthenticated" | "sync_error";
  nextPath?: "/personalizar" | "/inicio";
}> {
  const view = await resolveCheckoutSuccessState();
  if (view.kind === "active") {
    return { status: "active", nextPath: view.nextPath };
  }
  if (view.kind === "unauthenticated") {
    return { status: "unauthenticated" };
  }
  return { status: view.kind };
}
