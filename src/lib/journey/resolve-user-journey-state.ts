import "server-only";

import { cache } from "react";
import type { AuthUserContext } from "@/lib/auth/session";
import { getAuthUserContext } from "@/lib/auth/session";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { isLiveSubscriptionStatus } from "@/lib/billing/effective-subscription";
import {
  findLatestActionableIntentByUserId,
  findLatestCheckoutCreatedIntentByUserId,
  type SignupIntentStatus,
} from "@/lib/signup-intents";
import { createClient } from "@/lib/supabase/server";
import {
  getRequiredDestinationForState,
  resolveUserJourneyStateFromSnapshot,
  type JourneySnapshot,
  type UserJourneyState,
} from "./journey-state";

export type {
  UserJourneyState,
  JourneySnapshot,
  PlatformNavItem,
} from "./journey-state";

export {
  resolveUserJourneyStateFromSnapshot,
  getRequiredDestinationForState,
  getPlatformNavItemsForState,
  journeyAllowsChat,
  journeyHasEffectiveAccess,
  firstNameFromDisplayName,
} from "./journey-state";

const LIVE = new Set(["active", "trialing"]);

export function snapshotFromAuthContext(
  auth: AuthUserContext | null,
  extras?: {
    signupIntentStatus?: SignupIntentStatus | null;
    cancelAtPeriodEnd?: boolean;
    hasPastDueSubscription?: boolean;
    hasEndedSubscription?: boolean;
    emailConfirmed?: boolean;
  },
): JourneySnapshot {
  if (!auth || auth.demoMode) {
    if (auth?.demoMode) {
      return {
        authenticated: true,
        emailConfirmed: true,
        liveSubscriptionStatus: auth.subscriptionStatus,
        onboardingCompleted: auth.spiritualProfile.onboardingCompleted,
        cancelAtPeriodEnd: extras?.cancelAtPeriodEnd ?? false,
        signupIntentStatus: extras?.signupIntentStatus ?? null,
        hasPastDueSubscription: extras?.hasPastDueSubscription ?? false,
        hasEndedSubscription: extras?.hasEndedSubscription ?? false,
      };
    }
    return { authenticated: false };
  }

  const live =
    auth.subscriptionStatus && LIVE.has(auth.subscriptionStatus)
      ? auth.subscriptionStatus
      : null;

  return {
    authenticated: true,
    emailConfirmed: extras?.emailConfirmed ?? true,
    liveSubscriptionStatus: live,
    onboardingCompleted: auth.spiritualProfile.onboardingCompleted,
    cancelAtPeriodEnd: extras?.cancelAtPeriodEnd ?? false,
    signupIntentStatus: extras?.signupIntentStatus ?? null,
    hasPastDueSubscription: extras?.hasPastDueSubscription ?? false,
    hasEndedSubscription: extras?.hasEndedSubscription ?? false,
  };
}

function classifySubscriptions(rows: Array<{ status: string }>): {
  liveStatus: string | null;
  hasPastDue: boolean;
  hasEnded: boolean;
} {
  let liveStatus: string | null = null;
  let hasPastDue = false;
  let hasEnded = false;

  for (const row of rows) {
    if (isLiveSubscriptionStatus(row.status)) {
      liveStatus = row.status;
    } else if (row.status === "past_due") {
      hasPastDue = true;
    } else if (
      row.status === "canceled" ||
      row.status === "unpaid" ||
      row.status === "incomplete"
    ) {
      hasEnded = true;
    }
  }

  return { liveStatus, hasPastDue, hasEnded };
}

async function loadSignupIntentStatus(
  userId: string,
): Promise<SignupIntentStatus | null> {
  try {
    const processing = await findLatestCheckoutCreatedIntentByUserId(userId);
    if (processing) return processing.status;

    const actionable = await findLatestActionableIntentByUserId(userId);
    if (actionable) return actionable.status;
  } catch {
    // Backend may be unavailable in local/mock — fall through.
  }
  return null;
}

/**
 * Resolve journey from auth session + intent + subscriptions.
 * Does not call Stripe unless cancelAtPeriodEnd is passed in options.
 * Never infers state only from query string.
 * Per-request memoized when called with the same arguments (layout + page).
 */
export const resolveUserJourneyState = cache(async function resolveUserJourneyState(
  userIdOrOptions?:
    | string
    | {
        userId?: string;
        cancelAtPeriodEnd?: boolean;
        emailConfirmed?: boolean;
      },
): Promise<{
  state: UserJourneyState;
  destination: string;
  snapshot: JourneySnapshot;
  auth: AuthUserContext | null;
}> {
  const options =
    typeof userIdOrOptions === "string"
      ? { userId: userIdOrOptions }
      : (userIdOrOptions ?? {});

  const auth = await getAuthUserContext();

  if (!auth) {
    const snapshot: JourneySnapshot = { authenticated: false };
    const state = resolveUserJourneyStateFromSnapshot(snapshot);
    return {
      state,
      destination: getRequiredDestinationForState(state),
      snapshot,
      auth: null,
    };
  }

  if (options.userId && options.userId !== auth.userId && !auth.demoMode) {
    const snapshot: JourneySnapshot = { authenticated: false };
    const state = resolveUserJourneyStateFromSnapshot(snapshot);
    return {
      state,
      destination: getRequiredDestinationForState(state),
      snapshot,
      auth: null,
    };
  }

  let emailConfirmed = options.emailConfirmed;
  if (emailConfirmed === undefined && !auth.demoMode) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          emailConfirmed = Boolean(user.email_confirmed_at);
        }
      }
    } catch {
      emailConfirmed = true;
    }
  }

  const rows = auth.demoMode
    ? []
    : await loadUserSubscriptions(auth.userId).catch(() => []);
  const classified = classifySubscriptions(rows);

  const liveFromAuth =
    auth.subscriptionStatus && LIVE.has(auth.subscriptionStatus)
      ? auth.subscriptionStatus
      : null;

  const signupIntentStatus = auth.demoMode
    ? null
    : await loadSignupIntentStatus(auth.userId);

  const snapshot = snapshotFromAuthContext(auth, {
    signupIntentStatus,
    cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? false,
    hasPastDueSubscription: classified.hasPastDue,
    hasEndedSubscription: classified.hasEnded,
    emailConfirmed: emailConfirmed ?? true,
  });

  if (classified.liveStatus) {
    snapshot.liveSubscriptionStatus = classified.liveStatus;
  } else if (liveFromAuth) {
    snapshot.liveSubscriptionStatus = liveFromAuth;
  }

  const state = resolveUserJourneyStateFromSnapshot(snapshot);
  return {
    state,
    destination: getRequiredDestinationForState(state),
    snapshot,
    auth,
  };
});
