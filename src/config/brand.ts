/**
 * Public brand configuration for Amém Chat.
 * Repo/folder remain guia-escrituras internally.
 */

import { getCanonicalSiteUrl } from "@/lib/auth/app-url";
import { getSupportEmail } from "@/config/legal";

export interface BrandConfig {
  name: string;
  tagline: string;
  description: string;
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
  description: "Seu guIA cristão, baseado nas Escrituras.",
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
