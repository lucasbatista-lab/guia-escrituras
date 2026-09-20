import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  type UserJourneyState,
} from "@/lib/journey/journey-state";

/** Confirmed users may use /inicio and daily editorial, including unpaid. */
export function journeyCanAccessDaily(state: UserJourneyState): boolean {
  return state !== "anonymous" && state !== "awaiting_email_confirmation";
}

export function journeyCanPersonalize(state: UserJourneyState): boolean {
  return (
    state === "active_needs_personalization" ||
    state === "active_ready" ||
    state === "canceling_at_period_end" ||
    state === "confirmed_without_plan" ||
    state === "ended" ||
    state === "past_due"
  );
}

export function unpaidHomeAllowsDaily(state: UserJourneyState): boolean {
  return (
    state === "confirmed_without_plan" ||
    state === "ended" ||
    state === "past_due"
  );
}

export {
  getRequiredDestinationForState,
  journeyAllowsChat,
};
