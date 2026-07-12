import { describe, expect, it } from "vitest";
import { TheologyPolicyResolver } from "@/lib/theology";

describe("TheologyPolicyResolver", () => {
  const resolver = new TheologyPolicyResolver();

  it("never claims divine identity", () => {
    const policy = resolver.resolve({
      traditionKey: "evangelical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "balanced",
        saintsContentEnabled: false,
        preferredBibleTranslation: null,
        denomination: null,
      },
    });

    expect(policy.identityDisclaimer.toLowerCase()).toContain(
      "inteligência artificial",
    );
    expect(policy.generalRules.some((r) => r.includes("Não afirme ser Jesus"))).toBe(
      true,
    );
    expect(policy.allowsSaintsContent).toBe(false);
  });

  it("blocks saints content for evangelical even if user enables", () => {
    const policy = resolver.resolve({
      traditionKey: "evangelical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "brief",
        saintsContentEnabled: true,
        preferredBibleTranslation: null,
        denomination: "Batista",
      },
    });

    expect(policy.allowsSaintsContent).toBe(false);
    expect(
      policy.traditionRules.some((r) => r.includes("santos")),
    ).toBe(true);
  });

  it("allows saints for catholic when enabled", () => {
    const policy = resolver.resolve({
      traditionKey: "catholic",
      personaKey: "maria",
      userPrefs: {
        responseStyle: "reflective",
        preferredDepth: "deep",
        saintsContentEnabled: true,
        preferredBibleTranslation: "Ave Maria",
        denomination: null,
      },
    });

    expect(policy.allowsSaintsContent).toBe(true);
    expect(policy.personaKey).toBe("maria");
    expect(policy.composedSystemPromptSections.length).toBeGreaterThan(5);
  });
});
