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
  const conversation = read(
    "src",
    "components",
    "marketing",
    "paid-landing",
    "conversation-language.tsx",
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
  const posterSvg = read("public", "marketing", "comece-poster.svg");

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

  it("presents Caminho as the core offer with Essencial and Profundo accessible", () => {
    expect(plans).toContain("Plano recomendado");
    expect(plans).toContain("Para quem quer voltar ao longo da semana.");
    expect(plans).toContain("Escolher Caminho");
    expect(plans).toContain("Outras formas de usar o Amém Chat");
    expect(plans).toContain("Escolher Essencial");
    expect(plans).toContain("Escolher Profundo");
    expect(plans).toContain("CaminhoOffer");
    expect(plans.indexOf("CaminhoOffer")).toBeLessThan(
      plans.indexOf("Outras formas de usar o Amém Chat"),
    );
    expect(plans).not.toContain("mais escolhido");
    expect(plans).not.toContain("mais vendido");
    expect(plans).not.toContain("últimas vagas");
  });

  it("repositions the hero promise toward plan choice", () => {
    expect(page).toContain("Reflexões cristãs para situações reais");
    expect(page).toContain(
      "O que você está vivendo merece mais do que uma resposta genérica.",
    );
    expect(page).toContain(
      "Conte sua situação. O Amém Chat faz perguntas, organiza o contexto e",
    );
    expect(page).toContain("sem decidir por você");
    expect(page).toContain("Escolher meu plano");
    expect(page).toContain("Ver uma conversa de exemplo");
    expect(page).toContain('href="#planos"');
    expect(page).toContain('href="#demonstracao"');
    expect(page).toContain("A partir de R$38/mês · cobrança mensal");
    expect(page).toContain(
      "Conversas privadas · dados não vendidos · IA com limites claros",
    );
    expect(page).not.toContain(
      "Sua situação não cabe em um vídeo de 30 segundos.",
    );
    expect(page).not.toContain("Ver como funciona");
    expect(page).not.toContain("Começar agora");
    expect(page).toContain("Já sou assinante");
    expect(page).toContain('href="/entrar"');
    expect(page).not.toContain("SiteHeader");
    expect(page.toLowerCase()).not.toMatch(
      /depoimento|testemunho|freemium|% off|última chance|teste grátis|trial/,
    );
    expect(page).not.toMatch(/você está ansios|sua fé está|Deus trouxe você/i);
  });

  it("aligns poster and media with the forgiveness example", () => {
    expect(conversation).toContain(
      "Quero perdoar, mas não sei se isso significa voltar a conviver.",
    );
    expect(conversation).toContain(
      "O que precisa ser protegido antes de pensar em uma aproximação?",
    );
    expect(conversation).toContain("Efésios 4:31–32");
    expect(conversation).toContain("Colossenses 3:13");
    expect(conversation).toContain(
      "Defina o limite que precisaria ser respeitado.",
    );
    expect(posterSvg).toContain("Quero perdoar");
    expect(posterSvg).toContain("voltar a conviver");
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain("PaidLandingProductPoster");
    expect(media).toContain("playsInline");
    expect(media).not.toContain("autoPlay");
  });

  it("demonstrates a relatable path from tension to clarity", () => {
    expect(demo).not.toContain("fetch(");
    expect(demo).not.toContain("/api/chat");
    expect(demo).toContain("ContinuityThread");
    expect(demo).toContain("UserBubble");
    expect(demo).toContain("GuideBubble");
    expect(demo).toContain(
      "Eu quero perdoar alguém da minha família, mas não sei se perdoar",
    );
    expect(demo).toContain(
      "O que você deseja deixar para trás — e o que ainda precisa ser",
    );
    expect(demo).toContain("O que está em jogo");
    expect(demo).toContain("Deixar a raiva para trás.");
    expect(demo).toContain("A confiança ainda não foi reconstruída.");
    expect(demo).toContain("Perdoar não elimina prudência e limites.");
    expect(demo).toContain("Efésios 4:31–32");
    expect(demo).toContain("Colossenses 3:13");
    expect(demo).toContain("Romanos 12:18");
    expect(demo).toContain(
      "Escreva o limite que precisaria ser respeitado antes de uma nova",
    );
    expect(demo).toContain(
      "Conteúdos gerais partem de um tema. Aqui partimos da sua situação.",
    );
    expect(demo).toContain("a decisão continua sendo sua");
    expect(demo).not.toMatch(/Deus quer que você|perdoe e volte|nunca volte/i);
    expect(demo).not.toContain("proposta que melhora a renda");
    expect(page).not.toContain("Três movimentos da conversa");
    expect(page).not.toContain("Mecanismo");
  });

  it("creates a premium continuity discovery rhythm", () => {
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
    expect(continuity).toContain("deslize para ver mais");
    expect(continuity).toContain("Escolher meu plano");
    expect(continuity).toContain('href="#planos"');
    expect(continuity).toContain(
      "Caminho inclui Jornadas · Aprofundar está no Profundo.",
    );
    expect(continuity).toContain('bg-ink');
    expect(continuity).not.toMatch(/\b[\w.-]+@[\w.-]+\.\w+\b/);
  });

  it("places compact trust after the offer and keeps a four-question FAQ", () => {
    const planosIdx = page.indexOf('id="planos"');
    const confiancaIdx = page.indexOf('id="confianca"');
    expect(planosIdx).toBeGreaterThan(-1);
    expect(confiancaIdx).toBeGreaterThan(planosIdx);
    expect(page).toContain("Clareza sem ultrapassar limites.");
    expect(page).toContain("Privacidade");
    expect(page).toContain("Limites");
    expect(page).toContain("Controle");
    expect(page).toContain(
      "Você escolhe o plano e pode cancelar a renovação pela Conta.",
    );
    expect(page).toContain("O Amém Chat é apenas um ChatGPT cristão?");
    expect(page).toContain("Foi feito para reflexão cristã");
    expect(page).toContain("Posso cancelar?");
    expect(page).toContain("Ver todas as dúvidas");
    expect(page).toContain("Escolher meu plano");
    expect(page).toContain(
      "Sua situação tem detalhes. Sua reflexão também pode ter.",
    );
    expect(page).not.toContain("Quando não utilizar?");
    expect(page).not.toContain("As respostas são iguais para todo mundo?");
  });

  it("keeps sticky CTA plan-neutral after the hero CTA leaves view", () => {
    expect(mobileCta).toContain("comece-hero");
    expect(mobileCta).toContain('a[href="#planos"]');
    expect(mobileCta).toContain("heroCtaLeft");
    expect(mobileCta).toContain('sectionInView("planos"');
    expect(mobileCta).toContain("consentOpen");
    expect(mobileCta).toContain('sectionInView("comece-final-cta"');
    expect(sticky).toContain("Escolher meu plano");
    expect(sticky).toContain("Planos a partir de R$38/mês");
    expect(sticky).toContain("A partir de R$38/mês");
    expect(sticky).toContain('href="#planos"');
    expect(sticky).toContain("paid_landing_primary_cta_clicked");
    expect(sticky).not.toContain("Escolher Caminho");
    expect(sticky).not.toContain("buildCadastroHref");
    expect(sticky).not.toContain("paid_landing_plan_selected");
    expect(sticky).not.toContain('conversionPlan="caminho"');
    expect(sticky).not.toContain("Começar agora");
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
