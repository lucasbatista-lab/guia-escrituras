export type TraditionKey = "ecumenical" | "evangelical" | "catholic" | string;

export type ResponseStyle = "pastoral" | "reflective" | "practical" | "study";
export type PreferredDepth = "brief" | "balanced" | "deep";

export interface SpiritualProfilePrefs {
  traditionKey: TraditionKey;
  denomination?: string | null;
  preferredBibleTranslation?: string | null;
  responseStyle: ResponseStyle;
  preferredDepth: PreferredDepth;
  saintsContentEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface TraditionPolicy {
  key: TraditionKey;
  label: string;
  description: string;
  allowsSaintsContent: boolean;
  defaultResponseStyle: ResponseStyle;
  guidanceNotes: string[];
}

export interface PersonaDefinition {
  key: string;
  name: string;
  description: string;
  sourceBasis: string;
  active: boolean;
  requiresSaintsPolicy?: boolean;
  guidanceNotes: string[];
}

export interface PersonaPolicy {
  personaKey: string;
  allowedTraditionKeys?: TraditionKey[];
  blockedTraditionKeys?: TraditionKey[];
  extraGuidance: string[];
}

export interface TheologyPolicy {
  identityDisclaimer: string;
  generalRules: string[];
  traditionRules: string[];
  personaRules: string[];
  userPreferenceRules: string[];
  composedSystemPromptSections: string[];
  allowsSaintsContent: boolean;
  traditionKey: TraditionKey;
  personaKey: string;
}
