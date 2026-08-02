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
 * Experimental paid landing preview — shared composition, isolated measurement.
 * Public by direct URL; noindex/nofollow; not in sitemap/nav/footer.
 * Does not emit paid_landing_* view beacons.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/comece-v2" },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: `${PAGE_TITLE} · ${brand.name}`,
    description: PAGE_DESCRIPTION,
    url: `${brand.canonicalUrl}/comece-v2`,
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

export default function ComecePaidLandingV2Page() {
  return <PaidLandingCampaign mode="preview" />;
}
