/**
 * Public brand configuration for Amém Chat.
 * Repo/folder remain guia-escrituras internally.
 */

import { getCanonicalSiteUrl } from "@/lib/auth/app-url";

export interface BrandConfig {
  name: string;
  tagline: string;
  description: string;
  canonicalUrl: string;
  supportEmail: string;
  socialHandles: {
    instagram: string;
  };
}

const DEFAULT_BRAND = {
  name: "Amém Chat",
  tagline: "Como Jesus responderia à sua situação?",
  description: "Seu guIA cristão, baseado nas Escrituras.",
  supportEmail: "suporte@amemchat.com",
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
    supportEmail:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
      DEFAULT_BRAND.supportEmail,
    socialHandles: {
      instagram:
        process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE?.trim()?.replace(/^@/, "") ||
        DEFAULT_BRAND.socialHandles.instagram,
    },
  };
}

export const brand = getBrandConfig();
