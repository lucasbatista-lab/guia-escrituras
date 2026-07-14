import "server-only";

import { cookies } from "next/headers";
import { getAuthCookieOptions } from "@/lib/supabase/auth-cookie-options";
import { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";

export const CHECKOUT_RETURN_COOKIE = "amem_checkout_return";
export { isStripeCheckoutSessionId } from "@/lib/billing/stripe-session-id";

function cookieOptions(maxAgeSeconds: number) {
  const base = getAuthCookieOptions();
  return {
    ...base,
    httpOnly: true,
    maxAge: maxAgeSeconds,
  };
}

/**
 * Persist Checkout session reference for same-browser resume after
 * an unexpected auth gap. Does not create a Supabase session.
 */
export async function setCheckoutReturnCookie(
  sessionId: string,
): Promise<void> {
  if (!isStripeCheckoutSessionId(sessionId)) return;
  try {
    const store = await cookies();
    store.set(
      CHECKOUT_RETURN_COOKIE,
      sessionId.trim(),
      cookieOptions(60 * 60),
    );
  } catch {
    // Outside request context — ignore.
  }
}

export async function readCheckoutReturnCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    const value = store.get(CHECKOUT_RETURN_COOKIE)?.value?.trim();
    if (!value || !isStripeCheckoutSessionId(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearCheckoutReturnCookie(): Promise<void> {
  try {
    const store = await cookies();
    store.set(CHECKOUT_RETURN_COOKIE, "", cookieOptions(0));
  } catch {
    // ignore
  }
}

export function checkoutReturnLoginNext(): string {
  return "/assinatura/sucesso";
}
