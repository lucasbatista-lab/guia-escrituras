import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, toClientError } from "@/lib/safety";

const getAuthUserContext = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthUserContext: () => getAuthUserContext(),
}));

describe("journey api-auth AppError contract", () => {
  beforeEach(() => {
    getAuthUserContext.mockReset();
  });

  it("returns machine-readable unauthorized code for anonymous session", async () => {
    getAuthUserContext.mockResolvedValue(null);
    const { requireJourneySession } = await import("@/lib/journeys/api-auth");

    await expect(requireJourneySession()).rejects.toBeInstanceOf(AppError);

    try {
      await requireJourneySession();
    } catch (error) {
      const client = toClientError(error);
      expect(client.status).toBe(401);
      expect(client.code).toBe("unauthorized");
      expect(client.message).toBe("Faça login para continuar.");
    }
  });

  it("returns journeys_not_entitled for Essencial plan", async () => {
    getAuthUserContext.mockResolvedValue({
      userId: "syn-essencial",
      email: "essencial@amemchat.test",
      planKey: "essencial",
      spiritualProfile: { onboardingCompleted: true },
      isAdmin: false,
      demoMode: false,
    });
    const { requireJourneyEntitlement } = await import(
      "@/lib/journeys/api-auth"
    );

    try {
      await requireJourneyEntitlement();
      expect.unreachable("should throw");
    } catch (error) {
      const client = toClientError(error);
      expect(client.status).toBe(403);
      expect(client.code).toBe("journeys_not_entitled");
      expect(client.message).toMatch(/Caminho, Profundo e Particular/);
    }
  });

  it("allows Caminho plan through entitlement gate", async () => {
    const auth = {
      userId: "syn-caminho",
      email: "caminho@amemchat.test",
      planKey: "caminho" as const,
      spiritualProfile: { onboardingCompleted: true },
      isAdmin: false,
      demoMode: false,
    };
    getAuthUserContext.mockResolvedValue(auth);
    const { requireJourneyEntitlement } = await import(
      "@/lib/journeys/api-auth"
    );

    await expect(requireJourneyEntitlement()).resolves.toMatchObject({
      userId: "syn-caminho",
      planKey: "caminho",
    });
  });
});

describe("journey preview day-one API exception", () => {
  beforeEach(() => {
    getAuthUserContext.mockReset();
  });

  it("allows FREE to start (day-one preview) without reading_journeys", async () => {
    getAuthUserContext.mockResolvedValue({
      userId: "syn-free",
      email: "free@amemchat.test",
      planKey: null,
      spiritualProfile: { onboardingCompleted: true },
      isAdmin: false,
      demoMode: false,
    });
    const { requireJourneyPreviewStart } = await import(
      "@/lib/journeys/api-auth"
    );
    await expect(requireJourneyPreviewStart()).resolves.toMatchObject({
      userId: "syn-free",
      planKey: null,
    });
  });

  it("allows Essencial to complete step number 1 only", async () => {
    getAuthUserContext.mockResolvedValue({
      userId: "syn-essencial",
      email: "essencial@amemchat.test",
      planKey: "essencial",
      spiritualProfile: { onboardingCompleted: true },
      isAdmin: false,
      demoMode: false,
    });
    const { requireJourneyEntitlementOrPreviewStep } = await import(
      "@/lib/journeys/api-auth"
    );
    const { getAllJourneys } = await import("@/lib/journeys/registry");
    const journey = getAllJourneys()[0]!;
    const day1 = journey.steps[0]!;
    const day2 = journey.steps[1]!;

    await expect(
      requireJourneyEntitlementOrPreviewStep({
        journeySlug: journey.slug,
        stepId: day1.id,
      }),
    ).resolves.toMatchObject({ planKey: "essencial" });

    try {
      await requireJourneyEntitlementOrPreviewStep({
        journeySlug: journey.slug,
        stepId: day2.id,
      });
      expect.unreachable("day 2 should stay entitled-only");
    } catch (error) {
      const client = toClientError(error);
      expect(client.status).toBe(403);
      expect(client.code).toBe("journeys_not_entitled");
    }
  });

  it("still requires full entitlement for requireJourneyEntitlement", async () => {
    getAuthUserContext.mockResolvedValue({
      userId: "syn-free",
      email: "free@amemchat.test",
      planKey: null,
      spiritualProfile: { onboardingCompleted: true },
      isAdmin: false,
      demoMode: false,
    });
    const { requireJourneyEntitlement } = await import(
      "@/lib/journeys/api-auth"
    );
    await expect(requireJourneyEntitlement()).rejects.toBeInstanceOf(AppError);
  });
});
