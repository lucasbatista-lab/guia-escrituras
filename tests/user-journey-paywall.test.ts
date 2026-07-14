import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getPlatformNavItemsForState,
  getRequiredDestinationForState,
  journeyAllowsChat,
  resolveUserJourneyStateFromSnapshot,
  firstNameFromDisplayName,
  type UserJourneyState,
} from "@/lib/journey/journey-state";
import {
  PERSONALIZATION_DEPTHS,
  PERSONALIZATION_STYLES,
  PERSONALIZATION_TRADITIONS,
} from "@/lib/journey/personalization-labels";
import { AppError } from "@/lib/safety";
import { createMemoryRepositories } from "@/lib/database/repositories/memory";

const root = process.cwd();

function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

const generateSpy = vi.fn();
let memoryRepos = createMemoryRepositories();

vi.mock("@/lib/database/repositories", () => ({
  getRepositories: () => memoryRepos,
}));

vi.mock("@/lib/ai/gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gateway")>();
  return {
    ...actual,
    createAiProvider: () => ({
      generate: generateSpy,
    }),
    isOpenAiConfigured: () => false,
  };
});

vi.mock("@/config/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/runtime")>();
  return {
    ...actual,
    requiresRealOpenAiForChat: () => false,
  };
});

describe("resolveUserJourneyStateFromSnapshot", () => {
  it("maps each public state", () => {
    const cases: Array<{
      state: UserJourneyState;
      snapshot: Parameters<typeof resolveUserJourneyStateFromSnapshot>[0];
    }> = [
      { state: "anonymous", snapshot: { authenticated: false } },
      {
        state: "awaiting_email_confirmation",
        snapshot: { authenticated: true, emailConfirmed: false },
      },
      {
        state: "confirmed_without_plan",
        snapshot: { authenticated: true, emailConfirmed: true },
      },
      {
        state: "payment_pending",
        snapshot: {
          authenticated: true,
          signupIntentStatus: "ready_for_checkout",
        },
      },
      {
        state: "payment_processing",
        snapshot: {
          authenticated: true,
          signupIntentStatus: "checkout_created",
        },
      },
      {
        state: "active_needs_personalization",
        snapshot: {
          authenticated: true,
          liveSubscriptionStatus: "active",
          onboardingCompleted: false,
        },
      },
      {
        state: "active_ready",
        snapshot: {
          authenticated: true,
          liveSubscriptionStatus: "trialing",
          onboardingCompleted: true,
        },
      },
      {
        state: "past_due",
        snapshot: {
          authenticated: true,
          hasPastDueSubscription: true,
        },
      },
      {
        state: "canceling_at_period_end",
        snapshot: {
          authenticated: true,
          liveSubscriptionStatus: "active",
          onboardingCompleted: true,
          cancelAtPeriodEnd: true,
        },
      },
      {
        state: "ended",
        snapshot: {
          authenticated: true,
          hasEndedSubscription: true,
        },
      },
    ];

    for (const { state, snapshot } of cases) {
      expect(resolveUserJourneyStateFromSnapshot(snapshot)).toBe(state);
    }
  });

  it("never prefers query-string-only payment claims", () => {
    expect(
      resolveUserJourneyStateFromSnapshot({
        authenticated: true,
        emailConfirmed: true,
      }),
    ).toBe("confirmed_without_plan");
  });

  it("personalization needed beats cancel_at_period_end", () => {
    expect(
      resolveUserJourneyStateFromSnapshot({
        authenticated: true,
        liveSubscriptionStatus: "active",
        onboardingCompleted: false,
        cancelAtPeriodEnd: true,
      }),
    ).toBe("active_needs_personalization");
  });
});

describe("getRequiredDestinationForState", () => {
  it("maps destinations per state", () => {
    expect(getRequiredDestinationForState("confirmed_without_plan")).toBe(
      "/planos",
    );
    expect(getRequiredDestinationForState("payment_pending")).toBe(
      "/assinar/continuar",
    );
    expect(getRequiredDestinationForState("payment_processing")).toBe(
      "/assinatura/sucesso",
    );
    expect(getRequiredDestinationForState("active_needs_personalization")).toBe(
      "/personalizar",
    );
    expect(getRequiredDestinationForState("active_ready")).toBe("/inicio");
    expect(
      getRequiredDestinationForState("active_ready", {
        allowRequested: "/conversar",
      }),
    ).toBe("/conversar");
    expect(getRequiredDestinationForState("past_due")).toBe("/conta");
    expect(getRequiredDestinationForState("ended")).toBe("/planos");
    expect(getRequiredDestinationForState("canceling_at_period_end")).toBe(
      "/inicio",
    );
  });
});

describe("platform nav by state", () => {
  it("hides Conversar/Conversas without effective sub", () => {
    for (const state of [
      "confirmed_without_plan",
      "payment_pending",
      "ended",
      "past_due",
    ] as UserJourneyState[]) {
      const labels = getPlatformNavItemsForState(state).map((i) => i.label);
      expect(labels).not.toContain("Conversar");
      expect(labels).not.toContain("Conversas");
    }
  });

  it("shows Planos or Concluir assinatura when unpaid", () => {
    const unpaid = getPlatformNavItemsForState("confirmed_without_plan").map(
      (i) => i.label,
    );
    expect(unpaid).toContain("Planos");

    const pending = getPlatformNavItemsForState("payment_pending").map(
      (i) => i.label,
    );
    expect(pending).toContain("Concluir assinatura");
  });

  it("shows Personalizar when active without personalization", () => {
    const items = getPlatformNavItemsForState("active_needs_personalization");
    expect(items.some((i) => i.href === "/personalizar" && i.dominant)).toBe(
      true,
    );
    expect(items.map((i) => i.label)).not.toContain("Conversar");
  });

  it("shows full nav when active ready or canceling", () => {
    for (const state of [
      "active_ready",
      "canceling_at_period_end",
    ] as UserJourneyState[]) {
      const labels = getPlatformNavItemsForState(state).map((i) => i.label);
      expect(labels).toEqual(
        expect.arrayContaining(["Início", "Conversar", "Conversas", "Conta"]),
      );
      expect(journeyAllowsChat(state)).toBe(true);
    }
  });
});

describe("Portuguese personalization labels", () => {
  it("exposes public labels without rendering internal keys as UI text", () => {
    expect(PERSONALIZATION_TRADITIONS.map((t) => t.label)).toEqual([
      "Cristã ecumênica",
      "Evangélica",
      "Católica",
    ]);
    expect(PERSONALIZATION_STYLES.map((s) => s.label)).toEqual([
      "Acolhedor e reflexivo",
      "Direto e prático",
      "Estudo mais aprofundado",
    ]);
    expect(PERSONALIZATION_DEPTHS.map((d) => d.label)).toEqual([
      "Breve",
      "Equilibrada",
      "Profunda",
    ]);

    const form = readSrc("src", "components", "auth", "onboarding-form.tsx");
    expect(form).toContain("PERSONALIZATION_TRADITIONS");
    expect(form).toContain("Salvar e começar");
    expect(form).not.toContain("Concluir onboarding");
    expect(form).not.toMatch(/>\s*ecumenical\s*</);
  });

  it("personalizar page has required copy", () => {
    const page = readSrc(
      "src",
      "app",
      "(platform)",
      "personalizar",
      "page.tsx",
    );
    expect(page).toContain("Personalize sua experiência");
    expect(page).toContain(
      "Conte-nos como você prefere receber suas reflexões.",
    );
  });
});

describe("redirects and gates (source contracts)", () => {
  it("onboarding redirects to personalizar", () => {
    const page = readSrc("src", "app", "(auth)", "onboarding", "page.tsx");
    expect(page).toContain('redirect("/personalizar")');
  });

  it("proxy gates chat with subscription before personalization", () => {
    const proxy = readSrc("src", "lib", "supabase", "proxy.ts");
    expect(proxy).toContain("/personalizar");
    expect(proxy).toContain("unpaidDestination");
    expect(proxy).toContain("onboarding_completed");
    expect(proxy).toContain("getRequiredDestinationForState");
  });

  it("conversar and conversas redirect before ChatPanel", () => {
    const conversar = readSrc(
      "src",
      "app",
      "(platform)",
      "conversar",
      "page.tsx",
    );
    const conversas = readSrc(
      "src",
      "app",
      "(platform)",
      "conversas",
      "page.tsx",
    );
    expect(conversar).toContain("journeyAllowsChat");
    expect(conversar).toContain("getRequiredDestinationForState");
    expect(conversar.indexOf("if (!journeyAllowsChat")).toBeLessThan(
      conversar.indexOf("<ChatPanel"),
    );
    expect(conversas).toContain("journeyAllowsChat");
    expect(conversas).toContain("getRequiredDestinationForState");
  });

  it("post-login uses personalizar not onboarding", () => {
    const dest = readSrc("src", "lib", "auth", "post-login-destination.ts");
    expect(dest).toContain("getRequiredDestinationForState");
    expect(dest).not.toContain('"/onboarding"');
  });

  it("success page directs active users to personalizar", () => {
    const logic = readSrc("src", "lib", "billing", "checkout-success.ts");
    expect(logic).toContain('"/personalizar"');
    expect(logic).toContain("onboardingCompleted");
    expect(logic).not.toContain('"/onboarding"');
    const page = readSrc(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    expect(page).toContain("resolveCheckoutSuccessState");
    expect(page).not.toContain('"/onboarding"');
  });

  it("inicio has no chat card without access", () => {
    const page = readSrc("src", "app", "(platform)", "inicio", "page.tsx");
    expect(page).toContain("journeyAllowsChat");
    expect(page).toContain("Personalizar minha experiência");
    expect(page).toContain("Escolher meu plano");
    expect(page).toContain("Continuar para pagamento");
  });

  it("platform layout passes journey-derived nav", () => {
    const layout = readSrc("src", "app", "(platform)", "layout.tsx");
    expect(layout).toContain("getPlatformNavItemsForState");
    expect(layout).toContain("resolveUserJourneyState");
    expect(layout).toContain("PlatformNav");
  });
});

describe("chat API gate order", () => {
  beforeEach(() => {
    memoryRepos = createMemoryRepositories();
    generateSpy.mockReset();
  });

  it("returns 402 for missing subscription before personalization and before persist", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertSpy = vi.spyOn(memoryRepos.messages, "insertUserMessage");

    await expect(
      runChatTurn({
        requestId: "44444444-4444-4444-8444-444444444444",
        auth: {
          userId: "u-no-sub",
          email: "a@b.c",
          spiritualProfile: {
            traditionKey: "ecumenical",
            denomination: null,
            preferredBibleTranslation: null,
            responseStyle: "reflective",
            preferredDepth: "balanced",
            saintsContentEnabled: false,
            onboardingCompleted: false,
          },
          planKey: null,
          subscriptionStatus: null,
          subscriptionPeriodEnd: null,
          hasStripeSubscription: false,
          hasDuplicateSubscriptions: false,
          isAdmin: false,
          demoMode: false,
        },
        body: {
          message: "Olá",
          personaKey: "jesus",
          preferDeep: false,
        },
      }),
    ).rejects.toMatchObject({
      status: 402,
      code: "subscription_required",
    });

    expect(insertSpy).not.toHaveBeenCalled();
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("returns 403 personalization after subscription check", async () => {
    const { runChatTurn } = await import("@/lib/ai/chat-service");
    const insertSpy = vi.spyOn(memoryRepos.messages, "insertUserMessage");

    try {
      await runChatTurn({
        requestId: "55555555-5555-4555-8555-555555555555",
        auth: {
          userId: "u-no-pers",
          email: "a@b.c",
          spiritualProfile: {
            traditionKey: "ecumenical",
            denomination: null,
            preferredBibleTranslation: null,
            responseStyle: "reflective",
            preferredDepth: "balanced",
            saintsContentEnabled: false,
            onboardingCompleted: false,
          },
          planKey: "caminho",
          subscriptionStatus: "active",
          subscriptionPeriodEnd: null,
          hasStripeSubscription: true,
          hasDuplicateSubscriptions: false,
          isAdmin: false,
          demoMode: false,
        },
        body: {
          message: "Olá",
          personaKey: "jesus",
          preferDeep: false,
        },
      });
      expect.fail("expected personalization_required");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(403);
      expect((error as AppError).code).toBe("personalization_required");
    }

    expect(insertSpy).not.toHaveBeenCalled();
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("chat-service source checks subscription before personalization", () => {
    const service = readSrc("src", "lib", "ai", "chat-service.ts");
    const subIdx = service.indexOf("subscription_required");
    const persIdx = service.indexOf("personalization_required");
    expect(subIdx).toBeGreaterThan(-1);
    expect(persIdx).toBeGreaterThan(-1);
    expect(subIdx).toBeLessThan(persIdx);
    expect(service).not.toContain("Conclua o onboarding");
  });
});

describe("no free access", () => {
  it("journey denied states do not allow chat", () => {
    for (const state of [
      "anonymous",
      "awaiting_email_confirmation",
      "confirmed_without_plan",
      "payment_pending",
      "payment_processing",
      "active_needs_personalization",
      "past_due",
      "ended",
    ] as UserJourneyState[]) {
      expect(journeyAllowsChat(state)).toBe(false);
    }
  });

  it("firstName helper splits display name", () => {
    expect(firstNameFromDisplayName("Maria Silva")).toBe("Maria");
    expect(firstNameFromDisplayName(null)).toBeNull();
  });
});
