import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getBrandConfig } from "@/config/brand";
import {
  getSupportEmail,
} from "@/config/legal";
import { getCanonicalSiteUrl, getAppUrl } from "@/lib/auth/app-url";
import { PLAN_DEFINITIONS, getPlanByKey } from "@/lib/entitlements";
import { firstNameFromDisplayName } from "@/lib/journey";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("purchase experience — home copy & flow order", () => {
  const home = read("src", "app", "(marketing)", "page.tsx");

  it("follows the conversion section order", () => {
    const markers = [
      'href="#demonstracao"',
      "Começar com a minha situação",
      'id="demo-heading"',
      "Situações reais que você pode trazer",
      "Como o Amém Chat transforma situação em reflexão",
      "Como começar",
      "Profundidades e tradições",
      "Segurança, privacidade e limites",
      "Assinatura mensal com renovação automática",
      "Perguntas frequentes",
      "Estamos começando",
      "Pronto para trazer a sua situação?",
    ];
    let last = -1;
    for (const marker of markers) {
      const idx = home.indexOf(marker);
      expect(idx, marker).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("keeps CTAs and short hero transparency without defensive spam", () => {
    expect(home).toContain("Começar com a minha situação");
    expect(home).toContain("Ver uma reflexão de exemplo");
    expect(home).toContain("#demonstracao");
    expect(home).toContain("Planos a partir de");
    expect(home).toContain("Pagamento seguro");
    expect(home).toContain("Cancele quando quiser");
    expect(home).toContain("Tradição ecumênica, evangélica ou católica");
    // Short transparency line is allowed; long "Não afirma" stays out of hero spam
    const heroEnd = home.indexOf('id="demo-heading"');
    const hero = home.slice(0, heroEnd);
    expect(hero).toContain("Não é Jesus");
    expect(hero).not.toMatch(/Não afirma ser Jesus/);
    expect(home).toContain("Transparência sobre IA");
    expect(home).toContain("inteligência artificial");
  });

  it("how-to-start describes plan → email → pay → personalize → converse", () => {
    expect(home).toContain("Escolha seu plano");
    expect(home).toContain("Confirme seu e-mail");
    expect(home).toContain("Pague com segurança");
    expect(home).toContain("Personalize e converse");
  });

  it("does not show fake social proof or urgency", () => {
    const lowered = home.toLowerCase();
    expect(lowered).not.toMatch(/depoimento|testemunho/);
    expect(lowered).not.toMatch(/usuários ativos|milhares de/);
    expect(lowered).not.toMatch(/apenas hoje|últimas vagas|contagem regressiva/);
  });
});

describe("purchase experience — honest plan cards", () => {
  it("keeps prices unchanged", () => {
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
    expect(getPlanByKey("particular")?.priceMonthlyCents).toBe(98800);
  });

  it("uses Começar com Essencial/Caminho/Profundo CTAs", () => {
    expect(getPlanByKey("essencial")?.ctaLabel).toBe("Começar com Essencial");
    expect(getPlanByKey("caminho")?.ctaLabel).toBe("Começar com Caminho");
    expect(getPlanByKey("profundo")?.ctaLabel).toBe("Começar com Profundo");
  });

  it("keeps upcoming features outside active benefits", () => {
    for (const plan of PLAN_DEFINITIONS) {
      const active = (plan.displayBenefits ?? []).join(" ").toLowerCase();
      expect(active).not.toMatch(/whatsapp/);
      expect(active).not.toMatch(/respostas em áudio|respostas em audio/);
      expect(active).not.toMatch(/jornadas de leitura/);
      expect(active).not.toMatch(/múltiplas perspectivas|multiplas perspectivas/);
      expect(active).not.toMatch(/conversas profundas/);
      expect(active).not.toMatch(/suporte prioritário|suporte prioritario/);
      expect(active).not.toMatch(/memória estendida|memoria estendida/);
    }
    const profundo = getPlanByKey("profundo");
    expect(profundo?.upcomingBenefits?.join(" ")).toMatch(/áudio|audio/i);
    expect(profundo?.upcomingBenefits?.some((b) =>
      /resposta aprofundada/i.test(b),
    )).toBe(true);
    expect(profundo?.displayBenefits.join(" ")).toMatch(/margem/i);
    expect(profundo?.tagline).toMatch(/intens/i);
  });

  it("planos page explains renewal, cancellation and flexible use", () => {
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    expect(planos).toContain("Assinatura mensal com renovação automática");
    expect(planos).toContain("Cancelamento da renovação");
    expect(planos).toContain("uso justo");
    expect(planos).toContain("Checkout seguro");
    expect(planos).toContain("frequência");
    expect(planos).toContain("uso moderado");
    expect(planos).toContain("recomendação principal");
    const cards = read("src", "components", "marketing", "plan-cards.tsx");
    expect(cards).toContain("Disponível agora");
  });
});

describe("purchase experience — checkout continuation", () => {
  const page = read(
    "src",
    "app",
    "(platform)",
    "assinar",
    "continuar",
    "page.tsx",
  );

  it("polishes plan, renewal, security and remaining steps", () => {
    expect(page).toContain("Quase lá — confirme sua assinatura");
    expect(page).toContain("renovação automática");
    expect(page).toContain("cancelar a renovação");
    expect(page).toContain("Stripe");
    expect(page).toContain("Próximos passos");
    expect(page).toContain("Ir para pagamento seguro");
    expect(page).toContain("Personalizar sua experiência");
    expect(page).not.toMatch(/token_hash|PKCE|webhook/i);
  });
});

describe("purchase experience — support email honesty", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("defaults to amemchatbr@gmail.com when env is unset", () => {
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    delete process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL;
    expect(getSupportEmail()).toBe("amemchatbr@gmail.com");
    expect(getBrandConfig().supportEmail).toBe("amemchatbr@gmail.com");
  });

  it("does not invent suporte@amemchat.com in UI source", () => {
    const legal = read("src", "components", "legal", "legal-document-shell.tsx");
    const particular = read(
      "src",
      "app",
      "(marketing)",
      "mensagens-personalizadas",
      "page.tsx",
    );
    expect(legal).not.toContain("suporte@amemchat.com");
    expect(particular).not.toContain("suporte@amemchat.com");
    const brandSrc = read("src", "config", "brand.ts");
    const legalSrc = read("src", "config", "legal.ts");
    expect(brandSrc).not.toContain("suporte@amemchat.com");
    expect(legalSrc).not.toContain("suporte@amemchat.com");
    expect(legalSrc).toContain("amemchatbr@gmail.com");
  });
});

describe("purchase experience — canonical domain", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("uses https://amemchat.com.br as production canonical", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    process.env.VERCEL_URL = "guia-escrituras.vercel.app";
    expect(getCanonicalSiteUrl()).toBe("https://amemchat.com.br");
    expect(getAppUrl()).toBe("https://amemchat.com.br");
  });

  it("does not expose vercel.app when APP_URL is vercel in production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://amem-chat.vercel.app";
    expect(getCanonicalSiteUrl()).toBe("https://amemchat.com.br");
    expect(getAppUrl()).toBe("https://amemchat.com.br");
  });

  it("documents www→apex redirect and shared production cookie domain", () => {
    const templates = read("docs", "AUTH_EMAIL_TEMPLATES.md");
    const checklist = read("docs", "LAUNCH_CHECKLIST.md");
    expect(templates).toContain("www → apex");
    expect(templates).toContain("amemchat.com.br");
    expect(checklist).toContain("www → apex");
    const cookieOpts = read(
      "src",
      "lib",
      "supabase",
      "auth-cookie-options.ts",
    );
    expect(cookieOpts).toContain(".amemchat.com.br");
    expect(cookieOpts).toContain('sameSite: "lax"');
  });
});

describe("purchase experience — public UI language", () => {
  it("avoids internal keys and jargon in public/auth UI strings", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    const chat = read("src", "components", "chat", "chat-panel.tsx");
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    const conta = read("src", "app", "(platform)", "conta", "page.tsx");
    for (const src of [home, chat, inicio, conta]) {
      expect(src).not.toContain("política teológica");
      expect(src).not.toContain("Mentor principal");
      expect(src).not.toMatch(/Concluir onboarding|Conclua o onboarding/i);
      expect(src).not.toContain("tradition_key");
      expect(src).not.toContain("chat_deep");
      expect(src).not.toContain("fair_use_extended");
    }
  });

  it("greets with first name, not full email", () => {
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(inicio).toContain("firstNameFromDisplayName");
    expect(inicio).toContain("`Olá, ${firstName}`");
    expect(inicio).not.toMatch(/Olá,\s*\$\{auth\.email\}/);
    expect(firstNameFromDisplayName("Ana Beatriz")).toBe("Ana");
  });
});

describe("purchase experience — visual states & a11y hooks", () => {
  it("moves focus to titles and uses aria-live on key states", () => {
    const continuar = read(
      "src",
      "app",
      "(platform)",
      "assinar",
      "continuar",
      "page.tsx",
    );
    const sucesso = read(
      "src",
      "components",
      "billing",
      "checkout-success-client.tsx",
    );
    const loading = read("src", "app", "(platform)", "loading.tsx");
    const focus = read("src", "components", "a11y", "focus-page-title.tsx");
    expect(focus).toContain("tabIndex={-1}");
    expect(focus).toContain(".focus(");
    expect(continuar).toContain("FocusPageTitle");
    expect(continuar).toContain("aria-live");
    expect(sucesso).toContain("FocusPageTitle");
    expect(sucesso).toContain("aria-live");
    expect(loading).toContain('role="status"');
    const emailConfirmed = read(
      "src",
      "components",
      "auth",
      "email-confirmed-experience.tsx",
    );
    expect(emailConfirmed).toContain("prefers-reduced-motion");
  });
});

describe("purchase experience — auth email templates", () => {
  it("documents token_hash confirmation and support gate", () => {
    const doc = read("docs", "AUTH_EMAIL_TEMPLATES.md");
    expect(doc).toContain(
      "{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email",
    );
    expect(doc).toContain("Confirm signup");
    expect(doc).toContain("Reset password");
    expect(doc).toContain("Magic Link");
    expect(doc).toContain("Change email");
    expect(doc).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
    expect(doc).toContain("https://amemchat.com.br");
    expect(doc).toContain("P0 antes de billing");
  });
});
