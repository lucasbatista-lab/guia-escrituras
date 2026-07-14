import type { SignupIntentStatus } from "@/lib/signup-intents/types";

export type UserJourneyState =
  | "anonymous"
  | "awaiting_email_confirmation"
  | "confirmed_without_plan"
  | "payment_pending"
  | "payment_processing"
  | "active_needs_personalization"
  | "active_ready"
  | "past_due"
  | "canceling_at_period_end"
  | "ended";

export interface JourneySnapshot {
  authenticated: boolean;
  emailConfirmed?: boolean;
  /** Latest actionable or processing intent status, if any. */
  signupIntentStatus?: SignupIntentStatus | null;
  /** Live (active|trialing) subscription status when present. */
  liveSubscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
  onboardingCompleted?: boolean;
  hasPastDueSubscription?: boolean;
  hasEndedSubscription?: boolean;
}

export interface PlatformNavItem {
  href: string;
  label: string;
  dominant?: boolean;
}

const LIVE = new Set(["active", "trialing"]);

/**
 * Pure state machine — never reads query strings.
 */
export function resolveUserJourneyStateFromSnapshot(
  snapshot: JourneySnapshot,
): UserJourneyState {
  if (!snapshot.authenticated) {
    return "anonymous";
  }

  if (snapshot.emailConfirmed === false) {
    return "awaiting_email_confirmation";
  }

  const live = snapshot.liveSubscriptionStatus;
  const isLive = Boolean(live && LIVE.has(live));

  if (isLive) {
    if (!snapshot.onboardingCompleted) {
      return "active_needs_personalization";
    }
    if (snapshot.cancelAtPeriodEnd) {
      return "canceling_at_period_end";
    }
    return "active_ready";
  }

  if (snapshot.hasPastDueSubscription) {
    return "past_due";
  }

  const intent = snapshot.signupIntentStatus;
  if (intent === "checkout_created") {
    return "payment_processing";
  }
  if (
    intent === "ready_for_checkout" ||
    intent === "awaiting_confirmation" ||
    intent === "pending_signup"
  ) {
    return "payment_pending";
  }

  if (snapshot.hasEndedSubscription) {
    return "ended";
  }

  return "confirmed_without_plan";
}

/**
 * Canonical destination for a journey state.
 * For active_ready / canceling_at_period_end, preferred default is /inicio;
 * callers may allow a requested safe path when still active.
 */
export function getRequiredDestinationForState(
  state: UserJourneyState,
  options?: { allowRequested?: string | null },
): string {
  switch (state) {
    case "anonymous":
      return "/entrar";
    case "awaiting_email_confirmation":
      return "/confira-seu-email";
    case "confirmed_without_plan":
      return "/planos";
    case "payment_pending":
      return "/assinar/continuar";
    case "payment_processing":
      return "/assinatura/sucesso";
    case "active_needs_personalization":
      return "/personalizar";
    case "active_ready":
    case "canceling_at_period_end":
      return options?.allowRequested?.trim() || "/inicio";
    case "past_due":
      return "/conta";
    case "ended":
      return "/planos";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function journeyAllowsChat(state: UserJourneyState): boolean {
  return state === "active_ready" || state === "canceling_at_period_end";
}

export function journeyHasEffectiveAccess(state: UserJourneyState): boolean {
  return (
    state === "active_ready" ||
    state === "active_needs_personalization" ||
    state === "canceling_at_period_end"
  );
}

export function getPlatformNavItemsForState(
  state: UserJourneyState,
): PlatformNavItem[] {
  const base: PlatformNavItem[] = [{ href: "/inicio", label: "Início" }];

  switch (state) {
    case "anonymous":
      return [
        { href: "/inicio", label: "Início" },
        { href: "/planos", label: "Planos" },
      ];
    case "payment_pending":
    case "payment_processing":
      return [
        ...base,
        {
          href: "/assinar/continuar",
          label: "Concluir assinatura",
          dominant: true,
        },
        { href: "/conta", label: "Conta" },
      ];
    case "confirmed_without_plan":
    case "ended":
      return [
        ...base,
        { href: "/planos", label: "Planos", dominant: true },
        { href: "/conta", label: "Conta" },
      ];
    case "past_due":
      return [
        ...base,
        { href: "/conta", label: "Conta", dominant: true },
      ];
    case "active_needs_personalization":
      return [
        ...base,
        {
          href: "/personalizar",
          label: "Personalizar",
          dominant: true,
        },
        { href: "/conta", label: "Conta" },
      ];
    case "active_ready":
    case "canceling_at_period_end":
      return [
        ...base,
        { href: "/conversar", label: "Conversar" },
        { href: "/conversas", label: "Conversas" },
        { href: "/conta", label: "Conta" },
      ];
    case "awaiting_email_confirmation":
      return [
        {
          href: "/confira-seu-email",
          label: "Confirmar e-mail",
          dominant: true,
        },
        { href: "/planos", label: "Planos" },
      ];
    default:
      return [...base, { href: "/conta", label: "Conta" }];
  }
}

export function firstNameFromDisplayName(
  displayName: string | null | undefined,
): string | null {
  if (!displayName?.trim()) return null;
  const first = displayName.trim().split(/\s+/)[0];
  return first || null;
}
