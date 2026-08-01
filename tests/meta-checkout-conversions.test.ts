import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAdsSessionMetadata } from "@/lib/meta/emit-checkout-conversions";
import { META_SESSION_META } from "@/lib/meta/ads-checkout-context";

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("meta checkout and purchase conversions", () => {
  it("adds only non-financial ads metadata when consented", () => {
    expect(
      buildAdsSessionMetadata({
        advertisingConsent: false,
        eventSourceUrl: "https://amemchat.com.br/assinar/continuar",
        fbp: "fb.1.1700000000.1",
        fbc: "fb.1.1700000000.AbC",
        eventId: "evt_ic",
      }),
    ).toEqual({});

    const granted = buildAdsSessionMetadata({
      advertisingConsent: true,
      eventSourceUrl: "https://amemchat.com.br/assinar/continuar?utm_source=ig",
      fbp: "fb.1.1700000000.1",
      fbc: "fb.1.1700000000.AbC",
      eventId: "evt_ic_1",
    });
    expect(granted[META_SESSION_META.consent]).toBe("granted");
    expect(granted[META_SESSION_META.eventSourceUrl]).toBe(
      "https://amemchat.com.br/assinar/continuar",
    );
    expect(granted[META_SESSION_META.fbp]).toBe("fb.1.1700000000.1");
    expect(granted[META_SESSION_META.initiateEventId]).toBe("evt_ic_1");
    expect(granted).not.toHaveProperty("plan_key");
    expect(granted).not.toHaveProperty("user_id");
  });

  it("emits InitiateCheckout only after session create and Purchase only on webhook success", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    const webhook = read("src", "lib", "stripe", "webhook.ts");
    const success = read(
      "src",
      "app",
      "(platform)",
      "assinatura",
      "sucesso",
      "page.tsx",
    );
    const emit = read("src", "lib", "meta", "emit-checkout-conversions.ts");

    expect(checkout).toContain("buildAdsSessionMetadata");
    expect(checkout).toContain("emitInitiateCheckoutSafe");
    expect(checkout).toContain("sessionMetadata");
    expect(checkout).toContain("metadata: sharedMetadata");
    expect(checkout).toContain("metadata: sessionMetadata");
    expect(webhook).toContain("emitPurchaseConversionSafe");
    expect(webhook).toContain("checkout.session.completed");
    expect(success).not.toContain("sendMetaCapiEvent");
    expect(success).not.toContain("emitPurchaseConversionSafe");
    expect(emit).toContain("server-side only");
    expect(emit).toContain("providerEventId");
  });

  it("wires client ads context into checkout without financial mutation helpers", () => {
    const button = read(
      "src",
      "components",
      "billing",
      "start-checkout-button.tsx",
    );
    const continuar = read(
      "src",
      "app",
      "(platform)",
      "assinar",
      "continuar",
      "page.tsx",
    );
    const action = read("src", "lib", "billing", "checkout-action.ts");

    expect(button).toContain("collectAdsCheckoutContext");
    expect(button).toContain("startCheckoutAction");
    expect(continuar).toContain("StartCheckoutButton");
    expect(action).toContain("AdsCheckoutContext");
    expect(action).toContain("createSubscriptionCheckout(intentToken, adsContext)");
  });
});
