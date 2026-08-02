import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, formatPriceBRL } from "@/lib/entitlements";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("paid landing preview /comece-v2", () => {
  const page = read("src", "app", "(marketing)", "comece-v2", "page.tsx");
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
  const recognition = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-recognition.tsx",
  );
  const clarity = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-clarity.tsx",
  );
  const continuity = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-continuity.tsx",
  );
  const offer = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-offer.tsx",
  );
  const close = read(
    "src",
    "components",
    "marketing",
    "paid-landing-v2",
    "paid-landing-v2-close.tsx",
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
  const chrome = read("src", "components", "marketing", "site-chrome.tsx");
  const home = read("src", "app", "(marketing)", "page.tsx");
  const comece = read("src", "app", "(marketing)", "comece", "page.tsx");

  it("is a public noindex/nofollow preview outside sitemap, nav, footer, and home", () => {
    expect(page).toContain('canonical: "/comece-v2"');
    expect(page).toContain("index: false");
    expect(page).toContain("follow: false");
    expect(sitemap).not.toContain("comece-v2");
    expect(chrome).not.toContain("comece-v2");
    expect(home).not.toContain("comece-v2");
  });

  it("shares composition with /comece but stays in preview measurement mode", () => {
    expect(page).toContain("PaidLandingCampaign");
    expect(page).toContain('mode="preview"');
    expect(comece).toContain('mode="production"');
    expect(ids).toContain('plans: "planos-v2"');
    expect(ids).toContain('clarity: "clareza-v2"');
    expect(campaign).toContain("isProduction");
    expect(campaign).toContain('event="paid_landing_viewed"');
    // Preview must not mount beacons unconditionally — gated by isProduction
    expect(campaign).toContain("isProduction ? (");
  });

  it("keeps the polished V2 hero and product sequence", () => {
    expect(campaign).toContain("Reflexões cristãs para situações reais");
    expect(campaign).toContain("Organize o que está pesando.");
    expect(campaign).toContain("Enxergue um próximo passo.");
    expect(campaign).toContain("Receba perguntas e referências bíblicas");
    expect(campaign).toContain("Escolher meu plano");
    expect(campaign).toContain("Ver um exemplo");
    expect(campaign).toContain(
      "A partir de R$38/mês · cancele a renovação pela Conta",
    );
    expect(recognition).toContain(
      "Quero perdoar, mas não sei se isso significa voltar a conviver.",
    );
    expect(clarity).toContain("Do emaranhado à clareza possível.");
    expect(clarity).not.toContain("Parte da sua situação.");
    expect(continuity).toContain("Volte ao mesmo fio quando precisar.");
    expect(close).toContain("Separe o que está em jogo.");
  });

  it("packages Caminho / Essencial / Profundo from PLAN_DEFINITIONS", () => {
    expect(offer).toContain("getPublicCheckoutPlans");
    expect(offer).toContain("Retome sem começar do zero.");
    expect(offer).toContain("Conversa + Histórico");
    expect(offer).toContain("Caminho + Aprofundar");
    expect(offer).toContain("paid_landing_plan_selected");
    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    expect(caminho?.priceMonthlyCents).toBe(5800);
    expect(formatPriceBRL(caminho!.priceMonthlyCents)).toMatch(/58/);
  });

  it("keeps sticky plan-neutral and clear of product moments", () => {
    expect(sticky).toContain("Ver planos");
    expect(sticky).toContain("getPaidLandingCampaignIds");
    expect(sticky).not.toContain("buildCadastroHref");
    expect(sticky).not.toContain("paid_landing_plan_selected");
    expect(sticky).not.toContain("Escolher meu plano");
  });

  it("presents campaign-safe consent on preview and official surfaces", () => {
    expect(consent).toContain('pathname === "/comece-v2"');
    expect(consent).toContain('pathname === "/comece"');
    expect(consent).toContain("campaign");
  });

  it("preserves video-ready media and preview isolation from Meta Lead", () => {
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).not.toContain("autoPlay");
    expect(PUBLIC_CONVERSION_EVENTS).not.toContain("Lead");
    const browserEvents = read("src", "lib", "meta", "browser-events.ts");
    expect(browserEvents).not.toMatch(/trackLead|Lead/);
  });
});
