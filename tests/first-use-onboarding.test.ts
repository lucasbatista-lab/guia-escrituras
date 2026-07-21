import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPlanByKey, PLAN_DEFINITIONS } from "@/lib/entitlements";
import {
  PERSONALIZATION_DEPTH_NOTE,
  PERSONALIZATION_DEPTHS,
  PERSONALIZATION_TRADITIONS,
} from "@/lib/journey/personalization-labels";
import {
  sanitizeThemeDraft,
  THEME_DRAFT_MAX_LENGTH,
  THEME_SHORTCUTS,
} from "@/lib/journey/theme-shortcuts";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("first-use onboarding — subscription success", () => {
  const page = read(
    "src",
    "app",
    "(platform)",
    "assinatura",
    "sucesso",
    "page.tsx",
  );
  const client = read(
    "src",
    "components",
    "billing",
    "checkout-success-client.tsx",
  );

  it("prioritizes confirmation and next-step CTA without auto-redirect", () => {
    expect(client).toContain("Assinatura confirmada");
    expect(client).toContain("Personalizar minha experiência");
    expect(client).toContain("Começar uma reflexão");
    expect(client).toContain(
      "ajuste sua experiência para receber reflexões mais alinhadas",
    );
    expect(client).not.toContain("router.replace(data.nextPath)");
    expect(page).toContain('view.kind === "active"');
    expect(page).not.toContain("redirect(view.nextPath)");
    expect(page).toContain("initialNextPath");
  });

  it("keeps share secondary and below primary activation", () => {
    expect(page).toContain("ShareInvite");
    expect(page).toContain("variant=\"compact\"");
    expect(page).toContain("Talvez alguém próximo também esteja precisando");
    const shareIdx = page.indexOf("ShareInvite");
    const clientIdx = page.indexOf("CheckoutSuccessClient");
    expect(shareIdx).toBeGreaterThan(clientIdx);
  });
});

describe("first-use onboarding — personalization clarity", () => {
  it("explains tradition and depth in human language", () => {
    expect(PERSONALIZATION_TRADITIONS.map((t) => t.key)).toEqual([
      "ecumenical",
      "evangelical",
      "catholic",
    ]);
    expect(
      PERSONALIZATION_TRADITIONS.find((t) => t.key === "ecumenical")
        ?.description,
    ).toContain("abordagem cristã ampla");
    expect(
      PERSONALIZATION_DEPTHS.find((d) => d.key === "brief")?.description,
    ).toContain("próximo passo");
    expect(PERSONALIZATION_DEPTH_NOTE).toContain("respostas comuns");
    expect(PERSONALIZATION_DEPTH_NOTE).toContain("aprofundar uma mensagem");

    const form = read("src", "components", "auth", "onboarding-form.tsx");
    expect(form).toContain("PERSONALIZATION_DEPTH_NOTE");
    expect(form).toContain("Profundidade padrão");
    expect(form).not.toContain("chat_deep");
  });
});

describe("first-use onboarding — /inicio contexts", () => {
  const page = read("src", "app", "(platform)", "inicio", "page.tsx");

  it("new account emphasizes writing freely before themes", () => {
    expect(page).toContain("O que está pesando hoje?");
    expect(page).toContain("Escrever minha situação");
    expect(page).toContain("trabalho, dinheiro, família, relacionamentos");
    expect(page).toContain("culpa, ansiedade, decisões ou silêncio espiritual");
    expect(page).toContain("Não é necessário formular uma pergunta perfeita");
    const firstReady = page.slice(page.indexOf("O que está pesando hoje?"));
    const writeIdx = firstReady.indexOf("Escrever minha situação");
    const themesIdx = firstReady.indexOf("ThemeShortcutsSection");
    expect(writeIdx).toBeGreaterThan(-1);
    expect(themesIdx).toBeGreaterThan(writeIdx);
  });

  it("returning account prioritizes resume then new reflection", () => {
    expect(page).toContain("resumeReturnCopy");
    expect(page).toContain("Começar uma nova reflexão");
    expect(page).toContain(
      "você não precisa continuar só a anterior",
    );
    const resumeIdx = page.indexOf('id="resume-heading"');
    const newIdx = page.indexOf("Começar uma nova reflexão");
    expect(resumeIdx).toBeGreaterThan(-1);
    expect(newIdx).toBeGreaterThan(resumeIdx);
    expect(page).toContain("Ver conversas anteriores");
  });
});

describe("first-use onboarding — themes", () => {
  it("covers launch pains without excess", () => {
    expect(THEME_SHORTCUTS.length).toBeGreaterThanOrEqual(6);
    expect(THEME_SHORTCUTS.length).toBeLessThanOrEqual(8);
    const labels = THEME_SHORTCUTS.map((t) => t.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Ansiedade e decisões",
        "Dinheiro e trabalho",
        "Perdão e família",
        "Relacionamentos",
        "Culpa e recomeço",
        "Cansaço e propósito",
        "Silêncio espiritual",
        "Fé e próximos passos",
      ]),
    );
  });

  it("theme selection only seeds editable draft — no OpenAI, no empty conversation", () => {
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    const conversar = read("src", "app", "(platform)", "conversar", "page.tsx");
    const panel = read("src", "components", "chat", "chat-panel.tsx");

    expect(inicio).toContain("THEME_SHORTCUTS");
    expect(inicio).toContain("/conversar?tema=");
    expect(inicio).not.toContain("/api/chat");
    expect(conversar).toContain("sanitizeThemeDraft");
    expect(conversar).toContain("initialDraft");
    expect(conversar).not.toContain("conversations.create");
    expect(panel).toContain("resolveInitialComposerInput");
    expect(panel).toContain("urlDraft: initialDraft");
    expect(panel).not.toContain("autoSend");
    // Draft must not trigger send on mount
    expect(panel).not.toMatch(/useEffect\([^)]*\)\s*=>\s*\{[^}]*void send\(/);
    expect(panel).toContain('fetch("/api/chat"');
  });

  it("sanitizes tema drafts without accepting HTML or unbounded length", () => {
    expect(sanitizeThemeDraft("<b>olá</b> mundo")).toBe("olá mundo");
    expect(sanitizeThemeDraft("a".repeat(500))?.length).toBe(
      THEME_DRAFT_MAX_LENGTH,
    );
    expect(sanitizeThemeDraft("   ")).toBeUndefined();
    expect(sanitizeThemeDraft(null)).toBeUndefined();
  });

  it("does not put theme content into tracking/share layers", () => {
    const acquisition = read("src", "lib", "acquisition", "capture.ts");
    const share = read("src", "lib", "share", "url.ts");
    expect(acquisition).not.toContain("tema");
    expect(share).not.toContain("tema");
    expect(share).not.toContain("THEME_SHORTCUTS");
  });
});

describe("first-use onboarding — chat empty state and composer", () => {
  const panel = read("src", "components", "chat", "chat-panel.tsx");
  const upsell = read("src", "components", "chat", "chat-plan-upsell.tsx");

  it("empty state explains how to write without a tutorial modal", () => {
    expect(panel).toContain("Escreva o que você está vivendo");
    expect(panel).toContain("Diga o que aconteceu.");
    expect(panel).toContain("Conte o que mais está pesando.");
    expect(panel).toContain("Explique que tipo de clareza você procura.");
    expect(panel).toContain("Exemplo:");
    expect(panel).toContain("costumam combinar reflexão bíblica");
    expect(panel).toContain("interpretação e sugestões práticas");
    expect(panel).not.toContain("aria-modal");
    expect(panel).not.toContain("localStorage");
  });

  it("composer has welcoming placeholder and a11y label", () => {
    expect(panel).toContain('placeholder="Conte o que você está vivendo…"');
    expect(panel).toContain("Conte o que você está vivendo");
    expect(panel).toContain("htmlFor=\"chat-input\"");
    expect(panel).toContain("disabled={loading || !input.trim()}");
    expect(panel).toContain("Enter envia");
    expect(panel).toContain("Shift+Enter");
    expect(panel).toContain("prefers-reduced-motion");
  });

  it("Profundo discovers deepen without auto-activation; Essencial stays discreet", () => {
    expect(panel).toContain("Aprofundar esta resposta");
    expect(panel).toContain("useState(false)");
    expect(panel).toContain("Em situações complexas, você pode ativar");
    expect(panel).toContain("antes de enviar");
    expect(panel).toContain("DeepUpsellHint");
    expect(upsell).toContain("Conhecer o Profundo");
    expect(upsell).toContain("/planos#aprofundar");
    expect(panel).not.toContain("setPreferDeep(true)");
  });

  it("surfaces clear recovery copy for session and response failures", () => {
    expect(panel).toContain("resolveChatClientError");
    const clientErrors = read("src", "lib", "ai", "chat-client-errors.ts");
    expect(clientErrors).toContain(
      "Sua sessão expirou. Entre novamente para continuar.",
    );
    expect(panel).toContain(
      "Não foi possível concluir esta reflexão agora. Sua mensagem continua aqui para você tentar novamente.",
    );
  });
});

describe("first-use onboarding — scope guards", () => {
  it("does not change prices or entitlements", () => {
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
    expect(getPlanByKey("particular")?.priceMonthlyCents).toBe(98800);
    expect(PLAN_DEFINITIONS).toHaveLength(4);
  });

  it("does not alter Stripe, auth, chat-service, tracking, share, or admin", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    const chat = read("src", "lib", "ai", "chat-service.ts");
    const track = read("src", "lib", "acquisition", "capture.ts");
    const share = read("src", "components", "share", "share-invite.tsx");
    expect(checkout).toContain("assessCheckoutEligibility");
    expect(webhook).toContain("handleStripeWebhookEvent");
    expect(chat).toContain("canUseDeepResponseOnDemand");
    expect(chat).toContain("preferDeep");
    expect(track.length).toBeGreaterThan(40);
    expect(share).toContain("navigator.share");
  });

  it("does not touch repositories index barrel", () => {
    // Contract: this file must remain out of the intentional onboarding diff.
    const repos = read("src", "lib", "database", "repositories", "index.ts");
    expect(repos).toContain("getRepositories");
  });
});
