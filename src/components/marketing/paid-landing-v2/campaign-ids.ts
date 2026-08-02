export type PaidLandingCampaignMode = "production" | "preview";

export type PaidLandingCampaignIds = {
  hero: string;
  heroHeading: string;
  recognition: string;
  clarity: string;
  continuity: string;
  plans: string;
  faq: string;
  brand: string;
  finalCta: string;
};

/** Stable anchors: production keeps #planos / #demonstracao for acquisition contracts. */
export function getPaidLandingCampaignIds(
  mode: PaidLandingCampaignMode,
): PaidLandingCampaignIds {
  if (mode === "production") {
    return {
      hero: "comece-hero",
      heroHeading: "comece-hero-heading",
      recognition: "reconhecimento",
      clarity: "demonstracao",
      continuity: "continuidade",
      plans: "planos",
      faq: "faq",
      brand: "marca",
      finalCta: "comece-final-cta",
    };
  }

  return {
    hero: "comece-v2-hero",
    heroHeading: "comece-v2-hero-heading",
    recognition: "reconhecimento-v2",
    clarity: "clareza-v2",
    continuity: "continuidade-v2",
    plans: "planos-v2",
    faq: "faq-v2",
    brand: "marca-v2",
    finalCta: "comece-v2-final-cta",
  };
}
