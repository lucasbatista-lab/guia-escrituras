import "server-only";

import { safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  findLatestActionableIntentByUserId,
  findLatestCheckoutCreatedIntentByUserId,
  loadSignupIntentByToken,
} from "@/lib/signup-intents";
import { readSignupIntentCookie } from "@/lib/signup-intents/continuity-cookie";
import { getAuthUserContext } from "@/lib/auth/session";
import {
  getRequiredDestinationForState,
  resolveUserJourneyStateFromSnapshot,
  snapshotFromAuthContext,
  type UserJourneyState,
} from "@/lib/journey/resolve-user-journey-state";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { isLiveSubscriptionStatus } from "@/lib/billing/effective-subscription";

function continuationPath(token: string | null): string {
  if (token) {
    return `/assinar/continuar?intent=${encodeURIComponent(token)}`;
  }
  return "/assinar/continuar";
}

/**
 * Post-login destination priority:
 * 1. Valid intent from next/cookie → continuation
 * 2. Actionable / processing intent linked to user_id
 * 3. Journey state destination (personalizar, inicio, planos, etc.)
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
          record.status === "pending_signup"
        ) {
          return continuationPath(hintedToken);
        }
        if (record.status === "checkout_created") {
          return "/assinatura/sucesso";
        }
      }
    } catch {
      // ignore invalid backend config during resume — fall through
    }
  }

  try {
    const processing = await findLatestCheckoutCreatedIntentByUserId(userId);
    if (processing) {
      return "/assinatura/sucesso";
    }
    const actionable = await findLatestActionableIntentByUserId(userId);
    if (actionable) {
      return continuationPath(null);
    }
  } catch {
    // ignore
  }

  const rows = await loadUserSubscriptions(userId).catch(() => []);
  let liveStatus: string | null = null;
  let hasPastDue = false;
  let hasEnded = false;
  for (const row of rows) {
    if (isLiveSubscriptionStatus(row.status)) liveStatus = row.status;
    else if (row.status === "past_due") hasPastDue = true;
    else if (
      row.status === "canceled" ||
      row.status === "unpaid" ||
      row.status === "incomplete"
    ) {
      hasEnded = true;
    }
  }

  const snapshot = snapshotFromAuthContext(auth, {
    signupIntentStatus: null,
    hasPastDueSubscription: hasPastDue,
    hasEndedSubscription: hasEnded,
    emailConfirmed: true,
  });
  if (liveStatus) {
    snapshot.liveSubscriptionStatus = liveStatus;
  }

  const state: UserJourneyState = resolveUserJourneyStateFromSnapshot(snapshot);

  if (state === "active_ready" || state === "canceling_at_period_end") {
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
    return getRequiredDestinationForState(state, {
      allowRequested: safeRequested,
    });
  }

  return getRequiredDestinationForState(state);
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
