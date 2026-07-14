/**
 * Public legal configuration. Optional entity fields render only when set.
 */

export function getTermsVersion(): string {
  return process.env.NEXT_PUBLIC_TERMS_VERSION?.trim() || "2026-07-12";
}

export function getPrivacyVersion(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_VERSION?.trim() || "2026-07-12";
}

export function getLegalEntityName(): string | null {
  const v = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim();
  return v || null;
}

export function getLegalEntityDocument(): string | null {
  const v = process.env.NEXT_PUBLIC_LEGAL_ENTITY_DOCUMENT?.trim();
  return v || null;
}

/**
 * Public support address. Returns null when unset — never invent a fallback.
 * Configure NEXT_PUBLIC_SUPPORT_EMAIL before live billing (P0).
 */
export function getSupportEmail(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL?.trim() ||
    null
  );
}

/** User-facing copy when no support address is configured. */
export const SUPPORT_CHANNEL_PENDING = "Canal de suporte em configuração";

export const LEGAL_ROUTES = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/transparencia-ia", label: "Transparência IA" },
  { href: "/cancelamento", label: "Cancelamento" },
  { href: "/uso-justo", label: "Uso justo" },
] as const;
