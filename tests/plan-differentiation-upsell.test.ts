import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_ENTITLEMENT_KEYS,
  PLAN_DEFINITIONS,
  PLAN_ROADMAP_ITEMS,
  RESERVED_ENTITLEMENT_KEYS,
  getPlanByKey,
} from "@/lib/entitlements";
import { getPlanUpsellSuggestion } from "@/lib/marketing/plan-upsell";
import { logPlanConversionEvent } from "@/lib/marketing/plan-conversion-events";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";

vi.mock("@/lib/auth", () => ({
  getAuthUserContext: vi.fn(),
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getAuthUserContext } from "@/lib/auth";
import { logger } from "@/lib/logging/logger";
import { POST, GET } from "@/app/api/account/plan-interest/route";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

const FORBIDDEN_ACTIVE = [
  /respostas em áudio|respostas em audio/i,
  /whatsapp/i,
  /suporte prioritário|suporte prioritario/i,
  /memória estendida|memoria estendida|memória ampliada entre sessões/i,
  /múltiplas perspectivas|multiplas perspectivas/i,
  /ilimitado/i,
  /\d+\s*mensagens/i,
  /R\$\s*1[02]/,
  /budget/i,
  /Deus responderá|Jesus está conversando|revelação divina/i,
];

describe("plan differentiation — catalog", () => {
  it("keeps prices unchanged", () => {
    expect(getPlanByKey("essencial")?.priceMonthlyCents).toBe(3800);
    expect(getPlanByKey("caminho")?.priceMonthlyCents).toBe(5800);
    expect(getPlanByKey("profundo")?.priceMonthlyCents).toBe(18800);
  });

  it("positions Essencial as complete entry product", () => {
    const plan = getPlanByKey("essencial")!;
    expect(plan.idealFor).toMatch(/pontuais/i);
    expect(plan.displayBenefits.length).toBeLessThanOrEqual(5);
    const active = plan.displayBenefits.join(" ").toLowerCase();
    expect(active).toMatch(/reflexões|histórico|cancelamento/);
    expect(plan.upcomingBenefits).toBeUndefined();
  });

  it("highlights Caminho as recommended frequent use", () => {
    const plan = getPlanByKey("caminho")!;
    expect(plan.highlighted).toBe(true);
    expect(plan.idealFor).toMatch(/frequência/i);
    expect(plan.ctaLabel).toBe("Escolher o Caminho");
    expect(plan.displayBenefits.join(" ").toLowerCase()).toMatch(/frequente/);
  });

  it("positions Profundo with Aprofundar", () => {
    const plan = getPlanByKey("profundo")!;
    expect(plan.ctaLabel).toBe("Quero o Profundo");
    expect(
      plan.displayBenefits.some((b) => /aprofundar/i.test(b)),
    ).toBe(true);
    expect(plan.idealFor).toMatch(/além da primeira reflexão/i);
  });

  it("uses updated checkout CTAs", () => {
    expect(getPlanByKey("essencial")?.ctaLabel).toBe("Começar com o Essencial");
    expect(getPlanByKey("caminho")?.ctaLabel).toBe("Escolher o Caminho");
    expect(getPlanByKey("profundo")?.ctaLabel).toBe("Quero o Profundo");
  });

  it("does not sell reserved or upcoming items as active benefits", () => {
    for (const plan of PLAN_DEFINITIONS) {
      const active = (plan.displayBenefits ?? []).join(" ");
      for (const pattern of FORBIDDEN_ACTIVE) {
        expect(active, plan.key).not.toMatch(pattern);
      }
      if (plan.key === "essencial") {
        expect(active).not.toMatch(/jornadas de leitura/i);
      }
      if (plan.upcomingBenefits) {
        for (const upcoming of plan.upcomingBenefits) {
          expect(active.toLowerCase()).not.toContain(upcoming.toLowerCase());
        }
      }
    }
  });

  it("keeps reserved entitlements out of active set", () => {
    for (const key of RESERVED_ENTITLEMENT_KEYS) {
      expect(ACTIVE_ENTITLEMENT_KEYS.has(key)).toBe(false);
    }
    expect(ACTIVE_ENTITLEMENT_KEYS.has("chat_standard")).toBe(true);
    expect(ACTIVE_ENTITLEMENT_KEYS.has("chat_deep")).toBe(true);
  });
});

describe("plan differentiation — marketing surfaces", () => {
  it("plan cards show ideal for, billing note, and no roadmap mixed in", () => {
    const cards = read("src", "components", "marketing", "plan-cards.tsx");
    expect(cards).toContain("idealFor");
    expect(cards).toContain("Cobrança mensal");
    expect(cards).toContain("Recomendado");
    expect(cards).toContain("Com Aprofundar");
    expect(cards).not.toContain("Em desenvolvimento");
    expect(cards).toContain("min-h-11");
  });

  it("planos page is the commercial decision hub", () => {
    const planos = read("src", "app", "(marketing)", "planos", "page.tsx");
    expect(planos).toContain("comparar-uso");
    expect(planos).toContain("aprofundar");
    expect(planos).toContain("PLAN_COMMERCIAL_FAQ");
    expect(planos).toContain("Em desenvolvimento");
    expect(planos).toContain("troca automática");
    expect(planos).toContain("PlanComparisonViewBeacon");
  });

  it("home links to full plan comparison without duplicating roadmap in cards", () => {
    const home = read("src", "app", "(marketing)", "page.tsx");
    expect(home).toContain("Comparar todos os planos");
    expect(home).toMatch(/Caminho é a escolha natural/i);
    expect(home).toMatch(/Aprofundar sob demanda/i);
  });

  it("conta preserves billing and honest plan change notice", () => {
    const conta = read("src", "app", "(platform)", "conta", "page.tsx");
    expect(conta).toContain("SubscriptionManagementPanel");
    expect(conta).toContain("DataExportPanel");
    expect(conta).toContain("troca automática");
    expect(conta).toContain("comparar-uso");
  });
});

describe("plan differentiation — contextual upsells", () => {
  it("suggests Profundo for deep_not_entitled on Essencial and Caminho", () => {
    expect(
      getPlanUpsellSuggestion({
        currentPlanKey: "essencial",
        origin: "deep_not_entitled",
      })?.kind,
    ).toBe("profundo");
    expect(
      getPlanUpsellSuggestion({
        currentPlanKey: "caminho",
        origin: "deep_not_entitled",
      })?.ctaLabel,
    ).toBe("Conhecer o Profundo");
  });

  it("suggests Caminho when Essencial hits usage limits", () => {
    const monthly = getPlanUpsellSuggestion({
      currentPlanKey: "essencial",
      origin: "usage_limit",
      limitKind: "plan_limit",
    });
    expect(monthly?.kind).toBe("caminho");
    expect(monthly?.ctaLabel).toBe("Comparar com o Caminho");

    const daily = getPlanUpsellSuggestion({
      currentPlanKey: "essencial",
      origin: "usage_limit",
      limitKind: "daily_burst",
    });
    expect(daily?.body).toMatch(/temporário|amanhã/i);
  });

  it("suggests Profundo when Caminho hits usage limits", () => {
    expect(
      getPlanUpsellSuggestion({
        currentPlanKey: "caminho",
        origin: "usage_limit",
        limitKind: "plan_limit",
      })?.kind,
    ).toBe("profundo");
  });

  it("does not upsell Profundo subscribers commercially", () => {
    expect(
      getPlanUpsellSuggestion({
        currentPlanKey: "profundo",
        origin: "usage_limit",
        limitKind: "plan_limit",
      }),
    ).toBeNull();
    expect(
      getPlanUpsellSuggestion({
        currentPlanKey: "profundo",
        origin: "deep_not_entitled",
      }),
    ).toBeNull();
  });

  it("chat panel wires upsell components and plan key", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("ChatPlanUpsell");
    expect(panel).toContain("DeepUpsellHint");
    expect(panel).toContain("currentPlanKey");
    expect(panel).toContain("getPlanUpsellSuggestion");
  });

  it("keeps rate limit distinct from plan limit", () => {
    expect(
      resolveChatClientError({ status: 429, code: "budget_exceeded" }).kind,
    ).toBe("plan_limit");
    expect(
      resolveChatClientError({ status: 429, code: "burst_exceeded" }).kind,
    ).toBe("daily_burst");
    expect(
      resolveChatClientError({ status: 429, code: "rate_limited" }).kind,
    ).toBe("rate_limit");
  });
});

describe("plan differentiation — conversion events", () => {
  beforeEach(() => {
    vi.mocked(getAuthUserContext).mockResolvedValue({
      userId: "user-1",
      planKey: "essencial",
      email: "u@example.com",
    } as never);
    vi.mocked(logger.info).mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("logs plan interest without conversation content", async () => {
    const res = await POST(
      new Request("http://localhost/api/account/plan-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "upgrade_interest_clicked",
          targetPlanKey: "profundo",
          origin: "chat_panel",
        }),
      }),
    );
    expect(res.status).toBe(204);
    const payload = vi.mocked(logger.info).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(payload.event).toBe("upgrade_interest_clicked");
    expect(payload.userId).toBe("usr_user-1");
    expect(JSON.stringify(payload)).not.toMatch(/conversa|mensagem/i);
  });

  it("rejects invalid events safely", async () => {
    const res = await POST(
      new Request("http://localhost/api/account/plan-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "not_real" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET returns method not allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });

  it("logPlanConversionEvent masks user id", () => {
    logPlanConversionEvent({
      event: "plan_comparison_viewed",
      userId: "abcdef12-3456-7890-abcd-ef1234567890",
      currentPlanKey: "caminho",
    });
    const payload = vi.mocked(logger.info).mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >;
    expect(payload.userId).toBe("usr_abcdef12");
  });
});

describe("plan differentiation — roadmap separation", () => {
  it("lists roadmap items separately from purchasable benefits", () => {
    expect(PLAN_ROADMAP_ITEMS.some((i) => /jornadas/i.test(i))).toBe(false);
    expect(PLAN_ROADMAP_ITEMS.some((i) => /áudio|audio/i.test(i))).toBe(true);
  });
});
