/**
 * Read-only external Stripe Dashboard shortcuts for admin investigation.
 * Never mutates anything — just builds a search URL from an identifier that
 * must already be known server-side. Callers must not render the raw
 * identifier alongside the link when the UI otherwise masks it.
 */

export const STRIPE_DASHBOARD_EXTERNAL_LABEL = "Stripe Dashboard (externo)";

export const EXTERNAL_LINK_TARGET = "_blank" as const;
export const EXTERNAL_LINK_REL = "noopener noreferrer" as const;

export function buildStripeDashboardSearchUrl(identifier: string): string {
  const trimmed = identifier.trim();
  return `https://dashboard.stripe.com/search?query=${encodeURIComponent(trimmed)}`;
}

export interface ExternalLinkAttrs {
  href: string;
  target: typeof EXTERNAL_LINK_TARGET;
  rel: typeof EXTERNAL_LINK_REL;
}

/** Anchor attributes for any admin external link (Stripe, etc.). */
export function externalLinkAttrs(href: string): ExternalLinkAttrs {
  return {
    href,
    target: EXTERNAL_LINK_TARGET,
    rel: EXTERNAL_LINK_REL,
  };
}

export function buildStripeDashboardLinkAttrs(identifier: string): ExternalLinkAttrs {
  return externalLinkAttrs(buildStripeDashboardSearchUrl(identifier));
}
