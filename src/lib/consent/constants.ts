/** First-party advertising consent — bump when policy categories change. */
export const CONSENT_POLICY_VERSION = 2;

export const CONSENT_COOKIE_NAME = "amem_consent";
export const CONSENT_STORAGE_KEY = "amem_consent_v2";

/** ~180 days */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** Advertising cookies this origin may attempt to clear on revoke. */
export const ADVERTISING_COOKIE_NAMES = ["_fbp", "_fbc"] as const;

export const CONSENT_COPY = {
  banner:
    "Usamos cookies necessários para o Amém Chat funcionar. Com sua autorização, também medimos campanhas de publicidade.",
  accept: "Aceitar",
  refuse: "Recusar",
  configure: "Configurar",
  save: "Salvar preferências",
} as const;
