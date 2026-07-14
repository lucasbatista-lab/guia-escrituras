import "server-only";

import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  findLatestActionableIntentByUserId,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";
import { readSignupIntentCookie } from "@/lib/signup-intents/continuity-cookie";
import { getAuthUserContext } from "@/lib/auth/session";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function continuationPath(token: string | null): string {
  if (token) {
    return `/assinar/continuar?intent=${encodeURIComponent(token)}`;
  }
  return "/assinar/continuar";
}

/**
 * Post-login destination priority:
 * 1. Valid intent from next/cookie
 * 2. Actionable intent linked to user_id
 * 3. Active sub without personalization → /onboarding
 * 4. Active ready → /inicio
 * 5. No subscription → /planos
 *
 * Never uses /inicio as a universal fallback.
 */
export async function resolvePostLoginDestination(options?: {
  nextParam?: string | null;
  intentTokenHint?: string | null;
}): Promise<string> {
  const auth = await getAuthUserContext();

  if (!auth || auth.demoMode) {
    return safeNextPath(options?.nextParam ?? null, "/planos");
  }

  const userId = auth.userId;
  const cookieToken = await readSignupIntentCookie();
  const nextRaw = options?.nextParam ?? null;

  const hintedToken =
    options?.intentTokenHint?.trim() ||
    extractIntentFromNext(nextRaw) ||
    cookieToken;

  if (hintedToken) {
    try {
      const record = await loadSignupIntentByToken(hintedToken);
      if (
        record &&
        record.status !== "expired" &&
        record.status !== "completed" &&
        record.status !== "canceled" &&
        (!record.userId || record.userId === userId)
      ) {
        if (
          record.status === "ready_for_checkout" ||
          record.status === "awaiting_confirmation" ||
          record.status === "pending_signup" ||
          record.status === "checkout_created"
        ) {
          return continuationPath(hintedToken);
        }
      }
    } catch {
      // ignore invalid backend config during resume — fall through
    }
  }

  try {
    const actionable = await findLatestActionableIntentByUserId(userId);
    if (actionable) {
      return continuationPath(null);
    }
  } catch {
    // ignore
  }

  const subscribed =
    Boolean(auth.planKey) &&
    Boolean(auth.subscriptionStatus) &&
    ACTIVE_STATUSES.has(auth.subscriptionStatus!);

  if (subscribed) {
    if (!auth.spiritualProfile.onboardingCompleted) {
      return "/onboarding";
    }
    const safeRequested = nextRaw
      ? safeNextPath(nextRaw, "/inicio")
      : "/inicio";
    if (
      safeRequested.startsWith("/assinar") ||
      safeRequested.startsWith("/planos") ||
      safeRequested.startsWith("/confira") ||
      safeRequested.startsWith("/email-confirmado")
    ) {
      return "/inicio";
    }
    return safeRequested;
  }

  return "/planos";
}

function extractIntentFromNext(nextParam: string | null): string | null {
  if (!nextParam) return null;
  try {
    const path = safeNextPath(nextParam, "/planos");
    const url = new URL(path, "https://amemchat.com.br");
    return url.searchParams.get("intent")?.trim() || null;
  } catch {
    return null;
  }
}
