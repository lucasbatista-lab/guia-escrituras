import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { PaidLandingCampaign } from "@/components/marketing/paid-landing-v2/paid-landing-campaign";
import {
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";

const PAGE_TITLE = "Organize o que está pesando";
const PAGE_DESCRIPTION =
  "Conte sua situação. Receba perguntas e referências bíblicas que ajudam a separar o que está em jogo — com responsabilidade.";

/**
 * Official paid acquisition landing.
 * Uses the shared campaign composition in production measurement mode.
 * Public URL; noindex; not in sitemap. Meta remains env+consent gated.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/comece" },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  openGraph: {
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    url: `${brand.canonicalUrl}/comece`,
    siteName: brand.name,
    locale: "pt_BR",
    type: "website",
    images: socialOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    images: socialTwitterImages(),
  },
};

export default function ComecePaidLandingPage() {
  return <PaidLandingCampaign mode="production" />;
}
