import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";
import { PLAN_DEFINITIONS, getPlanByKey } from "@/lib/entitlements";
import { isUuid, safeNextPath } from "@/lib/navigation/safe-next-path";
import {
  trackingFromSearchParams,
  withTrackingParams,
} from "@/lib/navigation/tracking-href";
import {
  preferredDepthLabelPt,
  responseStyleLabelPt,
  traditionLabelPt,
} from "@/lib/profile/labels-pt";
import { validateCheckoutPlan } from "@/lib/signup-intents";

const root = process.cwd();

function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("safeNextPath", () => {
  it("accepts internal relative paths", () => {
    expect(safeNextPath("/inicio")).toBe("/inicio");
    expect(safeNextPath("/conversar?c=abc")).toBe("/conversar?c=abc");
  });

  it("rejects open redirects and schemes", () => {
    expect(safeNextPath("//evil.com")).toBe("/inicio");
    expect(safeNextPath("https://evil.com")).toBe("/inicio");
    expect(safeNextPath("/\\evil")).toBe("/inicio");
    expect(safeNextPath("javascript:alert(1)")).toBe("/inicio");
    expect(safeNextPath("data:text/html,x")).toBe("/inicio");
    expect(safeNextPath("/path?next=https://evil.com")).toBe("/inicio");
  });
});

describe("conversation reopen helpers", () => {
  it("validates UUID param", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  it("loads owned conversation messages and denies foreign ownership", async () => {
    const repos = createMemoryRepositories();
    const owner = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    const conversation = await repos.conversations.create({
      userId: owner,
      personaKey: "jesus",
      title: "Teste",
    });
    await repos.messages.insertUserMessage({
      conversationId: conversation.id,
      userId: owner,
      content: "Olá",
      requestId: "req-1",
    });

    const owned = await repos.conversations.getByIdForUser(
      conversation.id,
      owner,
    );
    expect(owned?.id).toBe(conversation.id);
    const history = await repos.messages.listRecent(
      conversation.id,
      owner,
      50,
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.content).toBe("Olá");

    const foreign = await repos.conversations.getByIdForUser(
      conversation.id,
      other,
    );
    expect(foreign).toBeNull();
  });

  it("conversar page wires ownership and uuid guards", () => {
    const page = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    expect(page).toContain("isUuid");
    expect(page).toContain("getByIdForUser");
    expect(page).toContain("notFound");
    expect(page).toContain("listRecent");
    expect(page).toContain("initialConversationId");
  });
});

describe("launch benefits honesty", () => {
  it("does not sell unavailable features as active benefits", () => {
    for (const plan of PLAN_DEFINITIONS) {
      const active = plan.displayBenefits.join(" ").toLowerCase();
      expect(active).not.toMatch(/whatsapp/);
      expect(active).not.toMatch(/áudio|audio|voz/);
      expect(active).not.toMatch(/jornadas de leitura/);
      expect(active).not.toMatch(/memória estendida/);
      expect(active).not.toMatch(/múltiplas perspectivas/);
    }

    const profundo = getPlanByKey("profundo")!;
    expect(profundo.upcomingBenefits?.join(" ").toLowerCase()).toMatch(/áudio|audio/);
    expect(profundo.upcomingBenefits?.some((b) => /memória estendida/i.test(b))).toBe(
      true,
    );
  });

  it("particular is request-access only", () => {
    const plan = getPlanByKey("particular")!;
    expect(plan.ctaType).toBe("request_access");
    expect(validateCheckoutPlan("particular")).toEqual({
      ok: false,
      code: "request_access_plan",
    });
    const cadastro = readSrc("src", "app", "(auth)", "cadastro", "page.tsx");
    expect(cadastro).toContain('planKey === "particular"');
    expect(cadastro).toContain("/mensagens-personalizadas");
    const particularPage = readSrc(
      "src",
      "app",
      "(marketing)",
      "mensagens-personalizadas",
      "page.tsx",
    );
    expect(particularPage).not.toContain('href="/cadastro"');
    expect(particularPage.toLowerCase()).not.toMatch(/prazo garantido|resposta imediata/);
  });
});

describe("production copy and jargon", () => {
  const productionFiles = [
    ["src", "app", "(marketing)", "page.tsx"],
    ["src", "app", "(marketing)", "planos", "page.tsx"],
    ["src", "app", "(marketing)", "mensagens-personalizadas", "page.tsx"],
    ["src", "app", "(marketing)", "transparencia-ia", "page.tsx"],
    ["src", "app", "(platform)", "jornada", "page.tsx"],
    ["src", "components", "platform", "platform-nav.tsx"],
  ] as const;

  it("removes prototype jargon from customer-facing pages", () => {
    for (const parts of productionFiles) {
      const text = readSrc(...parts).toLowerCase();
      expect(text).not.toContain("fundação");
      expect(text).not.toContain("entitlements");
      expect(text).not.toContain("reading_journeys");
      expect(text).not.toContain("catálogo interno");
      expect(text).not.toMatch(/\bmock\b/);
    }
  });

  it("removes jornada from platform navigation", () => {
    const nav = readSrc("src", "components", "platform", "platform-nav.tsx");
    expect(nav).not.toContain("/jornada");
    expect(nav).not.toContain("Jornada");
  });

  it("maps profile labels to Portuguese", () => {
    expect(traditionLabelPt("ecumenical")).toBe("Cristã ecumênica");
    expect(responseStyleLabelPt("pastoral")).toBe("Pastoral");
    expect(preferredDepthLabelPt("balanced")).toBe("Equilibrada");
    expect(preferredDepthLabelPt("deep")).toBe("Profunda");
    expect(responseStyleLabelPt("reflective")).toBe("Acolhedor e reflexivo");
  });
});

describe("UTM and referral preservation", () => {
  it("merges tracking into funnel hrefs", () => {
    const href = withTrackingParams("/cadastro?plan=caminho", {
      referralCode: "amigo1",
      utmSource: "ig",
      utmMedium: "social",
      utmCampaign: "launch",
      utmContent: "cta",
      utmTerm: "fe",
    });
    expect(href).toContain("plan=caminho");
    expect(href).toContain("ref=amigo1");
    expect(href).toContain("utm_source=ig");
    expect(href).toContain("utm_campaign=launch");
  });

  it("sanitizes oversized tracking params", () => {
    const long = "x".repeat(200);
    const parsed = trackingFromSearchParams({
      utm_source: long,
      ref: long,
    });
    expect(parsed.utm_source?.length).toBe(120);
    expect(parsed.ref?.length).toBe(120);
  });

  it("plan cards and header use TrackingLink", () => {
    const cards = readSrc("src", "components", "marketing", "plan-cards.tsx");
    const chrome = readSrc("src", "components", "marketing", "site-chrome.tsx");
    expect(cards).toContain("TrackingLink");
    expect(chrome).toContain("TrackingLink");
    expect(chrome).toContain("marketing-mobile-nav");
  });
});

describe("subscription success ownership", () => {
  it("verifies session metadata user before treating as active", () => {
    const logic = readSrc("src", "lib", "billing", "checkout-success.ts");
    expect(logic).toContain("metadata?.user_id");
    expect(logic).toContain("sessionUserId !== auth.userId");
    expect(logic).toContain("forbidden");
    expect(logic).toContain("isActiveSubscription");
    const page = readSrc(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    expect(page).toContain("resolveCheckoutSuccessState");
  });
});

describe("loading error not-found states", () => {
  it("ships Portuguese loading error and not-found without stack traces", () => {
    const loading = readSrc("src", "app", "loading.tsx");
    const error = readSrc("src", "app", "error.tsx");
    const notFound = readSrc("src", "app", "not-found.tsx");
    expect(loading).toContain("Carregando");
    expect(error).toContain("Algo deu errado");
    expect(error).not.toContain("error.stack");
    expect(error).not.toContain("{error.message}");
    expect(notFound).toContain("Página não encontrada");
  });
});
