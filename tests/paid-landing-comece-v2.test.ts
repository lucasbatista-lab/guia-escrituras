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
    expect(comece).not.toContain("comece-v2");
  });

  it("keeps /comece sales landing structurally intact", () => {
    expect(comece).toContain(
      "O que você está vivendo merece mais do que uma resposta genérica.",
    );
    expect(comece).toContain('id="planos"');
    expect(comece).toContain("PaidLandingPlans");
    expect(comece).toContain('event="paid_landing_viewed"');
  });

  it("uses the V2 campaign hero promise, CTAs, and price", () => {
    expect(page).toContain("Reflexões cristãs para situações reais");
    expect(page).toContain(
      "Organize o que está pesando. Enxergue um próximo passo à luz",
    );
    expect(page).toContain("Conte sua situação.");
    expect(page).toMatch(
      /faz perguntas, separa o que|Perguntas, referências bíblicas/,
    );
    expect(page).toContain("Escolher meu plano");
    expect(page).toContain("Ver um exemplo");
    expect(page).toContain('href="#planos-v2"');
    expect(page).toContain('href="#clareza-v2"');
    expect(page).toContain("A partir de R$38/mês");
    expect(page).toContain("Conversas privadas.");
    expect(page).not.toContain("PublicConversionBeacon");
    expect(page).not.toContain("paid_landing_viewed");
    expect(page.toLowerCase()).not.toMatch(
      /depoimento|testemunho|freemium|% off|última chance|teste grátis|trial/,
    );
    expect(page).not.toMatch(/você está ansios|sua fé está|Deus trouxe você/i);
  });

  it("creates a concise recognition moment without a long thread", () => {
    expect(recognition).toContain(
      "Quero perdoar alguém da minha família, mas não sei se perdoar",
    );
    expect(recognition).toContain(
      "O que você deseja deixar para trás — e o que ainda precisa ser",
    );
    expect(recognition).not.toContain("Situação /");
    expect(recognition).not.toContain("ContinuityThread");
    expect(recognition).not.toContain("fetch(");
    expect(recognition).not.toContain("/api/chat");
  });

  it("makes the clarity board a labeled illustrative before/after signature", () => {
    expect(clarity).toContain("Como a conversa ajuda a organizar");
    expect(clarity).toContain("Exemplo ilustrativo");
    expect(clarity).toContain("Antes");
    expect(clarity).toContain("Depois");
    expect(clarity).toContain("quero perdoar");
    expect(clarity).toContain("Deixar a raiva para trás.");
    expect(clarity).toContain("A confiança ainda não foi reconstruída.");
    expect(clarity).toContain("Perdão não elimina prudência e limites.");
    expect(clarity).toContain("Efésios 4:31–32");
    expect(clarity).toContain("Colossenses 3:13");
    expect(clarity).toContain("Romanos 12:18");
    expect(clarity).toContain("Parte da sua situação.");
    expect(clarity).toContain("Faz perguntas antes de responder.");
    expect(clarity).toContain("Mantém o fio para você continuar.");
    expect(clarity).toContain(
      "Conteúdos gerais partem de um tema. Aqui, a reflexão parte dos",
    );
    expect(clarity).toContain("aria-pressed");
    expect(clarity).toContain("motion-reduce");
    expect(clarity).not.toContain("screenshot");
    expect(clarity).not.toMatch(/ChatGPT|melhor que|superior/i);
  });

  it("extends premium continuity across four surfaces with plan honesty", () => {
    expect(continuity).toContain("Continue sem começar do zero");
    expect(continuity).toContain("Volte ao mesmo fio quando precisar.");
    expect(continuity).toContain("Hoje");
    expect(continuity).toContain("Histórico");
    expect(continuity).toContain("Jornada");
    expect(continuity).toContain("Aprofundar");
    expect(continuity).toContain("Disponível no Caminho e no Profundo");
    expect(continuity).toContain("Disponível no Profundo");
    expect(continuity).toContain("Só no Profundo");
    expect(continuity).toContain("Ver os planos");
    expect(continuity).toContain('href="#planos-v2"');
    expect(continuity).toContain(
      "Jornadas no Caminho e no Profundo. Aprofundar no Profundo.",
    );
  });

  it("packages Caminho from PLAN_DEFINITIONS with Essencial and Profundo alternatives", () => {
    expect(offer).toContain("getPublicCheckoutPlans");
    expect(offer).toContain("formatPriceBRL");
    expect(offer).toContain("buildCadastroHref");
    expect(offer).toContain("Plano recomendado");
    expect(offer).toContain(
      "Para situações que não terminam na primeira conversa.",
    );
    expect(offer).toContain("Escolher Caminho");
    expect(offer).toContain("Outras formas de usar o Amém Chat");
    expect(offer).toContain("Para reflexões pontuais.");
    expect(offer).toContain("Para temas que pedem mais análise.");
    expect(offer).toContain("Escolher Essencial");
    expect(offer).toContain("Escolher Profundo");
    expect(offer).toContain("Aprofundar");
    expect(offer).toContain("paid_landing_plan_selected");
    expect(offer).toContain("utm_source");
    expect(offer).toContain("referralCode");
    expect(offer).not.toContain("3800");
    expect(offer).not.toContain("trial");
    expect(offer).not.toContain("desconto");
    expect(offer).not.toContain("mais escolhido");
    expect(offer).not.toContain("garantia");
    expect(offer).not.toMatch(/terapia|pastor.*R\$|café/i);

    const caminho = PLAN_DEFINITIONS.find((p) => p.key === "caminho");
    const essencial = PLAN_DEFINITIONS.find((p) => p.key === "essencial");
    const profundo = PLAN_DEFINITIONS.find((p) => p.key === "profundo");
    expect(caminho?.highlighted).toBe(true);
    expect(caminho?.priceMonthlyCents).toBe(5800);
    expect(essencial?.priceMonthlyCents).toBe(3800);
    expect(profundo?.priceMonthlyCents).toBe(18800);
    expect(formatPriceBRL(caminho!.priceMonthlyCents)).toMatch(/58/);
    expect(caminho?.entitlements).toContain("reading_journeys");
    expect(profundo?.entitlements).toContain("chat_deep");
    expect(essencial?.entitlements).not.toContain("reading_journeys");
  });

  it("integrates compact trust, four FAQs, and a restrained final CTA", () => {
    expect(close).toContain("O Amém Chat decide por mim?");
    expect(close).toContain("O Amém Chat é apenas um ChatGPT cristão?");
    expect(close).toContain("Substitui pastor, padre, terapia ou emergência?");
    expect(close).toContain("Posso cancelar?");
    expect(close).toContain("experiência cristã estruturada");
    expect(close).toContain("Histórico");
    expect(close).toContain("Jornadas");
    expect(close).toContain("Aprofundar");
    expect(close).toContain("comece-v2-final-cta");
    expect(close).toContain(
      "Uma situação difícil pode começar a ficar mais clara quando você",
    );
    expect(close).toContain('href="#planos-v2"');
    expect(close).not.toContain("depoimento");
    expect(close).not.toContain("fundador");
    expect(close).not.toContain("especialista");
  });

  it("keeps sticky plan-neutral, compact, and preview-isolated", () => {
    expect(sticky).toContain("comece-v2-hero");
    expect(sticky).toContain('a[href="#planos-v2"]');
    expect(sticky).toContain("planos-v2");
    expect(sticky).toContain("comece-v2-final-cta");
    expect(sticky).toContain("consentOpen");
    expect(sticky).toContain("Escolher meu plano");
    expect(sticky).toContain(
      "Escolher meu plano — opções a partir de R$38 por mês",
    );
    expect(sticky).toContain("rounded-full");
    expect(sticky).not.toContain("buildCadastroHref");
    expect(sticky).not.toContain("paid_landing_plan_selected");
    expect(sticky).not.toContain("Escolher Caminho");
    expect(sticky).not.toContain("trackPublicConversion");
  });

  it("presents a campaign-safe consent variant only on /comece-v2", () => {
    expect(consent).toContain('pathname === "/comece-v2"');
    expect(consent).toContain('data-consent-variant');
    expect(consent).toContain("campaign");
    expect(consent).toContain("Usamos cookies necessários.");
    expect(consent).toContain("CONSENT_COPY.accept");
    expect(consent).toContain("CONSENT_COPY.refuse");
    expect(consent).toContain("CONSENT_COPY.configure");
    expect(consent).not.toMatch(/obrigat[oó]rio/i);
    expect(consent).not.toMatch(/cookies necessários para publicidade/i);
  });

  it("preserves video-ready media without dead play controls when unset", () => {
    expect(media).toContain("NEXT_PUBLIC_PAID_LANDING_VIDEO_URL");
    expect(media).toContain('preload="metadata"');
    expect(media).toContain("playsInline");
    expect(media).not.toContain("autoPlay");
    expect(media).toContain("PaidLandingV2ProductSurface");
  });

  it("does not invent social proof, Meta Lead, or content analytics fields", () => {
    expect(PUBLIC_CONVERSION_EVENTS).not.toContain("Lead");
    const browserEvents = read("src", "lib", "meta", "browser-events.ts");
    expect(browserEvents).not.toMatch(/trackLead|Lead/);
    expect(page).not.toContain("fbq");
    expect(page).not.toContain("PageView");
    expect(offer).not.toMatch(/perdão|família|Efésios 4|voltar a conviver/i);
    expect(page + recognition + clarity).not.toMatch(
      /\b[\w.-]+@[\w.-]+\.\w+\b/,
    );
  });

  it("keeps a useful noscript path into the real funnel", () => {
    expect(page).toContain("<noscript>");
    expect(page).toContain('href="#planos-v2"');
    expect(page).toContain("/cadastro?plan=caminho");
  });
});
