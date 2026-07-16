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

export {
  resolveUserJourneyState,
  snapshotFromAuthContext,
} from "./resolve-user-journey-state";

export {
  PERSONALIZATION_TRADITIONS,
  PERSONALIZATION_STYLES,
  PERSONALIZATION_DEPTHS,
  PERSONALIZATION_DEPTH_NOTE,
} from "./personalization-labels";
