/**
 * Legal document version identifiers (public, safe for client).
 * Full pages and consent persistence are expanded in later commits.
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
