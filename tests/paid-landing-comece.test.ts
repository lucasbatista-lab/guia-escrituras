import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, formatPriceBRL } from "@/lib/entitlements";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("paid landing /comece (promoted V2 composition)", () => {
  const page = read("src", "app", "(marketing)", "comece", "page.tsx");
  const campaign = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-campaign.tsx",
  );
  const ids = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "campaign-ids.ts",
  );
  const offer = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-offer.tsx",
  );
  const sticky = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-sticky.tsx",
  );
  const media = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-media.tsx",
  );
  const consent = read("src", "components", "consent", "consent-banner.tsx");
  const sitemap = read("src", "app", "sitemap.ts");
  const home = read("src", "app", "(marketing)", "page.tsx");
  const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
  const chrome = read("src", "components", "marketing", "site-chrome.tsx");

  it("keeps official metadata: public noindex, follow, canonical, out of sitemap", () => {
    expect(page).toContain('canonical: "/comece"');
    expect(page).toContain("index: false");
    expect(page).toContain("follow: true");
    expect(sitemap).not.toContain('"/comece"');
    expect(sitemap).toContain('"/cookies"');
  });

  it("uses the shared campaign composition in production mode", () => {
    expect(page).toContain("PaidLandingCampaign");
    expect(page).toContain('mode="production"');
    expect(campaign).toContain('mode: PaidLandingCampaignMode');
    expect(ids).toContain('plans: "planos"');
    expect(ids).toContain('clarity: "demonstracao"');
    expect(ids).toContain('hero: "comece-hero"');
  });

  it("promotes the lapidated V2 hero promise and CTAs", () => {
    expect(campaign).toContain("Organize o que está pesando.");
    expect(campaign).toContain("Enxergue um próximo passo.");
    expect(campaign).toContain("Receba perguntas e referências bíblicas");
    expect(campaign).toContain("Escolher meu plano");
    expect(campaign).toContain("Ver um exemplo");
    expect(campaign).toContain(
      "A partir de R$38/mês · cancele a renovação pela Conta",
    );
    expect(campaign).not.toContain("à luz das Escrituras");
    expect(page.toLowerCase()).not.toMatch(
      /depoimento|testemunho|freemium|% off|última chance|teste grátis|trial/,
    );
  });

  it("restores official first-party measurement without sensitive content", () => {
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_viewed");
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_demo_viewed");
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_plans_viewed");
    expect(campaign).toContain('event="paid_landing_viewed"');
    expect(campaign).toContain("paid_landing_primary_cta_clicked");
    expect(campaign).toContain("paid_landing_demo_clicked");
    expect(campaign).toContain("paid_landing_demo_viewed");
    expect(campaign).toContain("paid_landing_plans_viewed");
    expect(campaign).toContain("isProduction");
    expect(offer).toContain("paid_landing_plan_selected");
    expect(offer).toContain("buildCadastroHref");
    expect(offer).toContain("utm_source");
    expect(offer).toContain("referralCode");
    expect(sticky).not.toContain("paid_landing_plan_selected");
    expect(sticky).not.toContain("buildCadastroHref");
    expect(offer).not.toMatch(/perdão|família|Efésios 4|voltar a conviver/i);
    const client = read(
      "src",
      "lib",
      "acquisition",
      "public-events-client.ts",
    );
    expect(client).not.toMatch(/email|message|tradition|emotion|crisis|prompt/i);
    const browserEvents = read("src", "lib", "meta", "browser-events.ts");
    expect(browserEvents).not.toMatch(/trackLead|Lead/);
  });

  it("packages plans from PLAN_DEFINITIONS with explicit selection CTAs", () => {
    expect(offer).toContain("getPublicCheckoutPlans");
    expect(offer).toContain("formatPriceBRL");
    expect(offer).toContain("Escolher Caminho");
    expect(offer).toContain("Escolher Essencial");
    expect(offer).toContain("Escolher Profundo");
    expect(offer).not.toContain("3800");
    expect(offer).not.toContain("trial");
    expect(offer).not.toContain("mais escolhido");

    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    const essencial = PLAN_DEFINITIONS.find((p) => p.key === "essencial");
    const profundo = PLAN_DEFINITIONS.find((p) => p.key === "profundo");
    expect(caminho?.highlighted).toBe(true);
    expect(caminho?.priceMonthlyCents).toBe(5800);
    expect(essencial?.priceMonthlyCents).toBe(3800);
    expect(profundo?.priceMonthlyCents).toBe(18800);
    expect(formatPriceBRL(caminho!.priceMonthlyCents)).toMatch(/58/);
  });

  it("keeps video-ready media without autoplay and without Meta Lead", () => {
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain("playsInline");
    expect(media).toContain("controls");
    expect(media).toContain("object-contain");
    expect(media).not.toContain("object-cover");
    expect(media).toContain("aspect-[9/16]");
    expect(media).not.toContain("autoPlay");
    expect(media).toContain("PaidLandingV2ProductSurface");
  });

  it("uses compact campaign consent on /comece without changing legal semantics", () => {
    expect(consent).toContain('pathname === "/comece"');
    expect(consent).toContain('pathname === "/comece-v2"');
    expect(consent).toContain("campaignCompact");
    expect(consent).toContain("Usamos cookies necessários.");
    expect(consent).toContain("CONSENT_COPY.accept");
    expect(consent).toContain("CONSENT_COPY.refuse");
  });

  it("does not alter home, /planos nav, or introduce comece into chrome/sitemap", () => {
    expect(home).not.toContain("PaidLandingCampaign");
    expect(planos).toContain("PlanCards");
    expect(chrome).not.toContain('href="/comece"');
    expect(sitemap).not.toContain("comece-v2");
  });
});
