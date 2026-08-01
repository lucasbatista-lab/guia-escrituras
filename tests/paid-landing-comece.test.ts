import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, formatPriceBRL } from "@/lib/entitlements";
import { PUBLIC_CONVERSION_EVENTS } from "@/lib/acquisition/public-event-types";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("paid landing /comece", () => {
  const page = read("src", "app", "(marketing)", "comece", "page.tsx");
  const plans = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-plans.tsx",
  );
  const sitemap = read("src", "app", "sitemap.ts");
  const mobileCta = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-mobile-cta.tsx",
  );

  it("is a public noindex landing not listed in the sitemap", () => {
    expect(page).toContain('canonical: "/comece"');
    expect(page).toContain("index: false");
    expect(page).toContain("follow: true");
    expect(sitemap).not.toContain('"/comece"');
    expect(sitemap).toContain('"/cookies"');
  });

  it("uses PLAN_DEFINITIONS via getPublicCheckoutPlans and formatPriceBRL", () => {
    expect(plans).toContain("getPublicCheckoutPlans");
    expect(plans).toContain("formatPriceBRL");
    expect(plans).toContain("buildCadastroHref");
    expect(plans).toContain("displayBenefits");
    expect(plans).toContain("ctaLabel");
    expect(plans).toContain("paid_landing_plan_selected");

    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    expect(caminho?.highlighted).toBe(true);
    expect(caminho?.priceMonthlyCents).toBe(5800);
    expect(formatPriceBRL(caminho!.priceMonthlyCents)).toMatch(/58/);
    expect(plans).toContain("highlightBadge");
  });

  it("prioritizes Caminho first on mobile and desktop comparison order", () => {
    const mobileBlock = plans.slice(
      plans.indexOf("md:hidden"),
      plans.indexOf("hidden gap-4 md:grid"),
    );
    expect(mobileBlock.indexOf("caminho")).toBeLessThan(
      mobileBlock.indexOf("essencial"),
    );
    expect(mobileBlock.indexOf("essencial")).toBeLessThan(
      mobileBlock.indexOf("profundo"),
    );

    const desktopBlock = plans.slice(plans.indexOf("hidden gap-4 md:grid"));
    expect(desktopBlock.indexOf("essencial")).toBeLessThan(
      desktopBlock.indexOf("caminho"),
    );
    expect(desktopBlock.indexOf("caminho")).toBeLessThan(
      desktopBlock.indexOf("profundo"),
    );
  });

  it("keeps required copy, CTAs, and honesty constraints", () => {
    expect(page).toContain(
      "Sua situação não cabe em um vídeo de 30 segundos.",
    );
    expect(page).toContain("Ver planos");
    expect(page).toContain("Ver a demonstração");
    expect(page).not.toContain("Começar agora");
    expect(page).toContain("Já sou assinante");
    expect(page).toContain('href="/entrar"');
    expect(page).toContain("Sem anúncios dentro do produto");
    expect(page).toContain("Seus dados não são vendidos");
    expect(page).toContain("IA com limites claros");
    expect(page).toContain("PaidLandingDemo");
    expect(page).toContain("A conversa que continua");
    expect(page.toLowerCase()).not.toMatch(
      /depoimento|testemunho|freemium|% off|última chance/,
    );
    expect(page.toLowerCase()).not.toContain("sem teste gratuito inventado");
    expect(page).not.toContain("SiteHeader");
    expect(page).not.toMatch(/você está ansios|sua fé está|Deus trouxe você/i);
  });

  it("wires first-party paid landing events without sensitive fields", () => {
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_viewed");
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_demo_viewed");
    expect(PUBLIC_CONVERSION_EVENTS).toContain("paid_landing_plans_viewed");
    expect(page).toContain('event="paid_landing_viewed"');
    expect(page).toContain("paid_landing_primary_cta_clicked");
    expect(page).toContain("paid_landing_demo_clicked");
    expect(page).toContain("paid_landing_demo_viewed");
    expect(page).toContain("paid_landing_plans_viewed");
    const client = read(
      "src",
      "lib",
      "acquisition",
      "public-events-client.ts",
    );
    expect(client).not.toMatch(/email|message|tradition|emotion|crisis|prompt/i);
  });

  it("keeps demo offline and video non-blocking", () => {
    const demo = read(
      "src",
      "components",
      "marketing",
      "paid-landing",
      "paid-landing-demo.tsx",
    );
    const media = read(
      "src",
      "components",
      "marketing",
      "paid-landing",
      "paid-landing-media.tsx",
    );
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).toContain("ContinuityThread");
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain("PaidLandingProductPoster");
    expect(media).not.toContain("autoPlay");
  });

  it("hides sticky CTA over plans and while consent is open", () => {
    const sticky = read(
      "src",
      "components",
      "marketing",
      "paid-landing",
      "paid-landing-scroll-cta.tsx",
    );
    expect(mobileCta).toContain('sectionInView("planos"');
    expect(mobileCta).toContain("consentOpen");
    expect(mobileCta).toContain('sectionInView("comece-final-cta"');
    expect(sticky).toContain("Ver planos");
    expect(sticky).not.toContain("Começar agora");
  });
});
