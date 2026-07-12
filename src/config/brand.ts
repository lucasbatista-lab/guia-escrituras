/**
 * Public brand configuration for Amém Chat.
 * Repo/folder remain guia-escrituras internally.
 */

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

const DEFAULT_BRAND: BrandConfig = {
  name: "Amém Chat",
  tagline: "Como Jesus responderia à sua situação?",
  description: "Seu guIA cristão, baseado nas Escrituras.",
  canonicalUrl: "http://localhost:3000",
  supportEmail: "suporte@amemchat.com",
  socialHandles: {
    instagram: "amemchat",
  },
};

export function getBrandConfig(): BrandConfig {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_BRAND.name,
    tagline:
      process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || DEFAULT_BRAND.tagline,
    description: DEFAULT_BRAND.description,
    canonicalUrl:
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      DEFAULT_BRAND.canonicalUrl,
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
