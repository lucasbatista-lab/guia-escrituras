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
  const demo = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-demo.tsx",
  );
  const continuity = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-continuity.tsx",
  );
  const sitemap = read("src", "app", "sitemap.ts");
  const mobileCta = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-mobile-cta.tsx",
  );
  const sticky = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-scroll-cta.tsx",
  );
  const media = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "paid-landing-media.tsx",
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
    expect(plans).not.toContain("3800");
    expect(plans).not.toContain("trial");
    expect(plans).not.toContain("desconto");

    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    const essencial = PLAN_DEFINITIONS.find((p) => p.key === "essencial");
    const profundo = PLAN_DEFINITIONS.find((p) => p.key === "profundo");
    expect(caminho?.highlighted).toBe(true);
    expect(caminho?.priceMonthlyCents).toBe(5800);
    expect(essencial?.priceMonthlyCents).toBe(3800);
    expect(profundo?.priceMonthlyCents).toBe(18800);
    expect(formatPriceBRL(caminho!.priceMonthlyCents)).toMatch(/58/);
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

  it("keeps a single primary hero CTA into the demo with price from R$38", () => {
    expect(page).toContain(
      "Sua situação não cabe em um vídeo de 30 segundos.",
    );
    expect(page).toContain("Ver como funciona");
    expect(page).toContain('href="#demonstracao"');
    expect(page).toContain("Ver planos");
    expect(page).toContain('href="#planos"');
    expect(page).toContain("Planos a partir de R$38/mês");
    expect(page).toContain("Cancele a renovação pela sua Conta");
    expect(page).not.toContain("Começar agora");
    expect(page).not.toContain("Ver a demonstração");
    expect(page).toContain("Já sou assinante");
    expect(page).toContain('href="/entrar"');
    expect(page).toContain("A conversa que continua");
    expect(page).not.toContain("hidden sm:block");
    expect(page.toLowerCase()).not.toMatch(
      /depoimento|testemunho|freemium|% off|última chance|teste grátis|trial/,
    );
    expect(page).not.toContain("SiteHeader");
    expect(page).not.toMatch(/você está ansios|sua fé está|Deus trouxe você/i);
  });

  it("turns the demonstration into a compact product thread", () => {
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).toContain("ContinuityThread");
    expect(demo).toContain("UserBubble");
    expect(demo).toContain("GuideBubble");
    expect(demo).toContain("ScriptureChip");
    expect(demo).toContain("NextStepBlock");
    expect(demo).toContain("Assim a conversa organiza o que está em jogo");
    expect(demo).toContain("Não é mais um vídeo nem um chat genérico");
    expect(demo).toContain("Contexto → pergunta → próximos passos");
    expect(demo).not.toContain("1. Situação");
    expect(demo).not.toContain("2. Pergunta de aprofundamento");
    expect(demo).not.toContain("5. Continuidade");
    expect(page).not.toContain("Três movimentos da conversa");
    expect(page).not.toContain("Mecanismo");
  });

  it("proves continuity with real product surface previews", () => {
    expect(page).toContain("PaidLandingContinuity");
    expect(continuity).toContain("Volte ao mesmo fio quando precisar");
    expect(continuity).toContain("Continuar conversa");
    expect(continuity).toContain("Histórico");
    expect(continuity).toContain("Perdão e limites");
    expect(continuity).toContain("3/7");
    expect(continuity).toContain("Aprofundar");
    expect(continuity).toContain("Disponível no Profundo");
    expect(continuity).toContain("Só no Profundo");
    expect(continuity).toContain("não no Essencial nem no Caminho");
    expect(continuity).toContain("Disponível no Caminho e no Profundo");
    expect(continuity).toContain("Parte da sua situação");
    expect(continuity).not.toMatch(/\b[\w.-]+@[\w.-]+\.\w+\b/);
    expect(page).not.toContain("A conversa não termina no primeiro dia");
  });

  it("simplifies trust to three pillars and FAQ to four questions", () => {
    expect(page).toContain("Privacidade");
    expect(page).toContain("Limites honestos");
    expect(page).toContain("Controle");
    expect(page).toContain("Cobrança mensal segura com Stripe");
    expect(page).not.toContain("Pagamento seguro com Stripe na assinatura");
    expect(page).toContain("O Amém Chat é apenas um ChatGPT cristão?");
    expect(page).toContain("Posso cancelar?");
    expect(page).toContain("Ver todas as dúvidas");
    expect(page).toContain("Escolher um plano");
    expect(page).toContain(
      "Sua situação tem detalhes. Sua reflexão também pode ter.",
    );
    expect(page).not.toContain("Quando não utilizar?");
    expect(page).not.toContain("As respostas são iguais para todo mundo?");
    expect(page).not.toContain("Como funciona a privacidade?");
  });

  it("wires sticky CTA to Caminho after the demo with UTM/ref preservation", () => {
    expect(mobileCta).toContain("demonstracao");
    expect(mobileCta).toContain("demoSufficientlySeen");
    expect(mobileCta).toContain('sectionInView("planos"');
    expect(mobileCta).toContain("consentOpen");
    expect(mobileCta).toContain('sectionInView("comece-final-cta"');
    expect(sticky).toContain("Escolher Caminho");
    expect(sticky).toContain("Caminho ·");
    expect(sticky).toContain("buildCadastroHref");
    expect(sticky).toContain("paid_landing_plan_selected");
    expect(sticky).toContain('conversionPlan="caminho"');
    expect(sticky).toContain('buildCadastroHref("caminho"');
    expect(sticky).not.toContain("Começar agora");
    expect(sticky).not.toContain(">Ver planos<");
  });

  it("keeps video non-blocking and poster-ready without dead play controls", () => {
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain("PaidLandingProductPoster");
    expect(media).toContain("playsInline");
    expect(media).not.toContain("autoPlay");
  });

  it("wires first-party paid landing events without sensitive fields or Meta Lead", () => {
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
    const browserEvents = read("src", "lib", "meta", "browser-events.ts");
    expect(browserEvents).not.toMatch(/trackLead|Lead/);
  });
});
