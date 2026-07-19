/**
 * Public brand configuration for Amém Chat.
 * Repo/folder remain guia-escrituras internally.
 */

import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { getSupportEmail } from "@/config/legal";

export interface BrandConfig {
  name: string;
  /** Marketing hero tagline (may ask a reflective question). */
  tagline: string;
  /** Short product line for UI chrome. */
  description: string;
  /** Default document title for SEO / social (no divine-voice claims). */
  seoTitle: string;
  /** Meta description for SEO / social (states AI clearly). */
  seoDescription: string;
  canonicalUrl: string;
  /** Configured support address, or null when unset (never invent one). */
  supportEmail: string | null;
  socialHandles: {
    instagram: string;
  };
}

const DEFAULT_BRAND = {
  name: "Amém Chat",
  tagline: "Como Jesus responderia à sua situação?",
  description: "Reflexões cristãs baseadas nas Escrituras.",
  seoTitle: "Amém Chat | Reflexões cristãs para situações reais",
  seoDescription:
    "Converse com uma inteligência artificial inspirada nas Escrituras para refletir com acolhimento, responsabilidade e esperança sobre situações da sua vida.",
  socialHandles: {
    instagram: "amem.chat",
  },
};

export function getBrandConfig(): BrandConfig {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_BRAND.name,
    tagline:
      process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || DEFAULT_BRAND.tagline,
    description: DEFAULT_BRAND.description,
    seoTitle: DEFAULT_BRAND.seoTitle,
    seoDescription: DEFAULT_BRAND.seoDescription,
    canonicalUrl: getCanonicalSiteUrl(),
    supportEmail: getSupportEmail(),
    socialHandles: {
      instagram:
        process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE?.trim()?.replace(/^@/, "") ||
        DEFAULT_BRAND.socialHandles.instagram,
    },
  };
}

export const brand = getBrandConfig();
