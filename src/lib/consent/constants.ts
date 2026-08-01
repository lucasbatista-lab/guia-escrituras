/** First-party advertising consent — bump when policy categories change. */
export const CONSENT_POLICY_VERSION = 1;

export const CONSENT_COOKIE_NAME = "amem_consent";
export const CONSENT_STORAGE_KEY = "amem_consent_v1";

/** ~180 days */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** Advertising cookies this origin may attempt to clear on revoke. */
export const ADVERTISING_COOKIE_NAMES = ["_fbp", "_fbc"] as const;

export const CONSENT_COPY = {
  banner:
    "Usamos cookies necessários para o funcionamento do Amém Chat. Com sua autorização, também usamos tecnologias de publicidade para medir campanhas e melhorar a divulgação. Você pode aceitar, recusar ou alterar sua escolha depois.",
  accept: "Aceitar publicidade",
  refuse: "Recusar",
  configure: "Configurar",
  save: "Salvar preferências",
} as const;
