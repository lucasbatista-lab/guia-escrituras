import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  stripeModeLabelPt,
  stripeOverallStatusPt,
  stripePlanReadyLabelPt,
  translateStripeReadinessIssue,
} from "@/lib/stripe/readiness-labels";
import { getStripePriceIdForPlan, StripeConfigError } from "@/lib/stripe";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("checkout promotion codes", () => {
  it("enables allow_promotion_codes without auto-applying discounts", () => {
    const checkout = read("src", "lib", "stripe", "checkout.ts");
    expect(checkout).toContain("allow_promotion_codes: true");
    expect(checkout).not.toContain("discounts:");
    expect(checkout).not.toMatch(/promotion_code\s*:/);
    expect(checkout).toContain("mode: \"subscription\"");
    expect(checkout).toContain("client_reference_id");
  });

  it("rejects Particular from Stripe price checkout", () => {
    expect(() => getStripePriceIdForPlan("particular")).toThrow(
      StripeConfigError,
    );
  });
});

describe("admin stripe readiness panel", () => {
  it("wires on-demand button to readiness endpoint", () => {
    const page = read("src", "app", "admin", "page.tsx");
    const panel = read(
      "src",
      "components",
      "admin",
      "stripe-readiness-panel.tsx",
    );
    expect(page).toContain("Prontidão de pagamentos");
    expect(page).toContain("StripeReadinessPanel");
    expect(panel).toContain("Verificar configuração da Stripe");
    expect(panel).toContain("/api/admin/stripe/readiness");
    expect(panel).toContain("401");
    expect(panel).toContain("403");
    expect(panel).toContain("stripeOverallStatusPt");
    expect(panel).toContain("translateStripeReadinessIssue");
    const labels = read("src", "lib", "stripe", "readiness-labels.ts");
    expect(labels).toContain("Pronto para cobranças reais");
    expect(labels).toContain("Configuração incompleta");
    expect(panel).not.toMatch(/sk_live_|sk_test_|whsec_/);
    expect(panel).not.toContain("STRIPE_SECRET");
  });

  it("translates ready and problem states without leaking IDs", () => {
    expect(stripeOverallStatusPt(true)).toBe("Pronto para cobranças reais");
    expect(stripeOverallStatusPt(false)).toBe("Configuração incompleta");
    expect(stripeModeLabelPt("live")).toBe("Produção real");
    expect(stripeModeLabelPt("test")).toBe("Testes");
    expect(stripePlanReadyLabelPt(true)).toBe("Pronto");
    expect(stripePlanReadyLabelPt(false)).toBe("Com problema");

    const essencialIssue = translateStripeReadinessIssue(
      "essencial: unit_amount_mismatch",
    );
    expect(essencialIssue).toContain("Essencial");
    expect(essencialIssue).not.toMatch(/price_/);
    expect(essencialIssue).not.toMatch(/sk_/);

    expect(translateStripeReadinessIssue("webhook_secret_missing")).toMatch(
      /webhook/i,
    );
    expect(
      translateStripeReadinessIssue("caminho: price_not_found_in_mode"),
    ).toContain("Caminho");
  });
});
