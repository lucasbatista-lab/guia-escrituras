import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import {
  buildStripeDashboardSearchUrl,
  buildStripeDashboardLinkAttrs,
  externalLinkAttrs,
  STRIPE_DASHBOARD_EXTERNAL_LABEL,
  EXTERNAL_LINK_TARGET,
  EXTERNAL_LINK_REL,
} from "@/lib/admin/stripe-dashboard-links";
import { correlatePaymentEventsToUsers } from "@/lib/admin/payment-correlation";
import {
  paymentProcessingStatusHumanLabelPt,
  PAYMENT_EVENT_UNCORRELATED_LABEL,
  PAYMENT_EVENT_AMBIGUOUS_LABEL,
} from "@/lib/admin/labels";

type FakeRow = Record<string, unknown>;

function makeFakeClient(tables: Record<string, FakeRow[]>) {
  return {
    from: (table: string) => ({
      select: () => ({
        in: (column: string, values: string[]) => {
          const rows = (tables[table] ?? []).filter((row) =>
            values.includes(row[column] as string),
          );
          return Promise.resolve({ data: rows, error: null });
        },
      }),
    }),
  };
}

describe("buildStripeDashboardSearchUrl", () => {
  it("builds a dashboard search URL with encoded identifier", () => {
    const url = buildStripeDashboardSearchUrl("cus_ABC123");
    expect(url).toBe("https://dashboard.stripe.com/search?query=cus_ABC123");
  });

  it("encodes special characters safely", () => {
    const url = buildStripeDashboardSearchUrl("cs_test 1+2/3");
    expect(url).not.toContain(" ");
    expect(decodeURIComponent(url.split("query=")[1] ?? "")).toBe(
      "cs_test 1+2/3",
    );
  });

  it("trims whitespace before encoding", () => {
    const url = buildStripeDashboardSearchUrl("  sub_XYZ  ");
    expect(url).toBe("https://dashboard.stripe.com/search?query=sub_XYZ");
  });
});

describe("external link helpers", () => {
  it("always uses target=_blank and rel=noopener noreferrer", () => {
    const attrs = externalLinkAttrs("https://dashboard.stripe.com/search?query=x");
    expect(attrs.target).toBe("_blank");
    expect(attrs.rel).toBe("noopener noreferrer");
    expect(EXTERNAL_LINK_TARGET).toBe("_blank");
    expect(EXTERNAL_LINK_REL).toBe("noopener noreferrer");
  });

  it("builds Stripe dashboard link attrs from an identifier", () => {
    const attrs = buildStripeDashboardLinkAttrs("cus_ABC");
    expect(attrs.href).toContain("cus_ABC");
    expect(attrs.target).toBe("_blank");
    expect(attrs.rel).toBe("noopener noreferrer");
  });

  it("exposes a stable external label", () => {
    expect(STRIPE_DASHBOARD_EXTERNAL_LABEL).toBe("Stripe Dashboard (externo)");
  });
});

describe("correlatePaymentEventsToUsers", () => {
  it("resolves a single user via subscriptions.stripe_customer_id", async () => {
    const client = makeFakeClient({
      subscriptions: [
        { user_id: "user-1", stripe_customer_id: "cus_1", stripe_subscription_id: null },
      ],
      billing_customers: [],
      signup_intents: [],
    });
    const result = await correlatePaymentEventsToUsers(client as never, ["cus_1"]);
    expect(result.get("cus_1")).toEqual({ userId: "user-1", ambiguous: false });
  });

  it("resolves a single user via subscriptions.stripe_subscription_id", async () => {
    const client = makeFakeClient({
      subscriptions: [
        { user_id: "user-2", stripe_customer_id: null, stripe_subscription_id: "sub_1" },
      ],
      billing_customers: [],
      signup_intents: [],
    });
    const result = await correlatePaymentEventsToUsers(client as never, ["sub_1"]);
    expect(result.get("sub_1")).toEqual({ userId: "user-2", ambiguous: false });
  });

  it("resolves a single user via billing_customers", async () => {
    const client = makeFakeClient({
      subscriptions: [],
      billing_customers: [{ user_id: "user-3", stripe_customer_id: "cus_3" }],
      signup_intents: [],
    });
    const result = await correlatePaymentEventsToUsers(client as never, ["cus_3"]);
    expect(result.get("cus_3")).toEqual({ userId: "user-3", ambiguous: false });
  });

  it("resolves a single user via signup_intents checkout session id (cs_ only)", async () => {
    const client = makeFakeClient({
      subscriptions: [],
      billing_customers: [],
      signup_intents: [
        { user_id: "user-4", stripe_checkout_session_id: "cs_test_4" },
      ],
    });
    const result = await correlatePaymentEventsToUsers(client as never, [
      "cs_test_4",
    ]);
    expect(result.get("cs_test_4")).toEqual({ userId: "user-4", ambiguous: false });
  });

  it("does not query signup_intents for non-checkout-session ids", async () => {
    let signupIntentsQueried = false;
    const client = {
      from: (table: string) => {
        if (table === "signup_intents") signupIntentsQueried = true;
        return {
          select: () => ({
            in: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    };
    await correlatePaymentEventsToUsers(client as never, ["cus_no_cs"]);
    expect(signupIntentsQueried).toBe(false);
  });

  it("marks ambiguous when two distinct users match the same object id", async () => {
    const client = makeFakeClient({
      subscriptions: [
        { user_id: "user-a", stripe_customer_id: "cus_dup", stripe_subscription_id: null },
      ],
      billing_customers: [
        { user_id: "user-b", stripe_customer_id: "cus_dup" },
      ],
      signup_intents: [],
    });
    const result = await correlatePaymentEventsToUsers(client as never, [
      "cus_dup",
    ]);
    expect(result.get("cus_dup")).toEqual({ userId: null, ambiguous: true });
  });

  it("returns null/not-ambiguous for object ids with no match", async () => {
    const client = makeFakeClient({
      subscriptions: [],
      billing_customers: [],
      signup_intents: [],
    });
    const result = await correlatePaymentEventsToUsers(client as never, [
      "cus_unknown",
    ]);
    expect(result.get("cus_unknown")).toEqual({ userId: null, ambiguous: false });
  });

  it("never guesses by email or name — only exact technical id columns", async () => {
    const source = await fs.readFile(
      "src/lib/admin/payment-correlation.ts",
      "utf8",
    );
    expect(source).not.toMatch(/\.ilike\(|display_name|"email"|'email'/i);
    expect(source).toContain("stripe_customer_id");
    expect(source).toContain("stripe_subscription_id");
    expect(source).toContain("stripe_checkout_session_id");
  });

  it("returns an empty map for an empty/blank id list without querying", async () => {
    let queried = false;
    const client = {
      from: () => {
        queried = true;
        return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };
    const result = await correlatePaymentEventsToUsers(client as never, [
      null,
      undefined,
      "  ",
    ]);
    expect(result.size).toBe(0);
    expect(queried).toBe(false);
  });
});

describe("payment status humanization", () => {
  it("shows Parado only for a stuck received event", () => {
    expect(paymentProcessingStatusHumanLabelPt("received", true)).toBe("Parado");
    expect(paymentProcessingStatusHumanLabelPt("received", false)).toBe(
      "Recebido",
    );
    expect(paymentProcessingStatusHumanLabelPt("processed", true)).toBe(
      "Processado",
    );
    expect(paymentProcessingStatusHumanLabelPt("failed", false)).toBe("Falhou");
  });

  it("exposes stable correlation labels", () => {
    expect(PAYMENT_EVENT_UNCORRELATED_LABEL).toBe("Não correlacionado");
    expect(PAYMENT_EVENT_AMBIGUOUS_LABEL).toContain("mais de um usuário");
  });
});

describe("admin payment investigation stays read-only", () => {
  it("correlation, dashboard links and metrics never call Stripe mutations", async () => {
    const files = [
      "src/lib/admin/payment-correlation.ts",
      "src/lib/admin/stripe-dashboard-links.ts",
      "src/lib/admin/metrics.ts",
      "src/app/admin/eventos/page.tsx",
      "src/app/admin/usuarios/[userId]/page.tsx",
    ];
    for (const file of files) {
      const source = await fs.readFile(file, "utf8");
      expect(source).not.toMatch(
        /\.(cancel|update|del)\(|stripe\.(subscriptions|refunds|paymentIntents)\.(cancel|update|create)/,
      );
      expect(source).not.toContain("refund");
    }
  });

  it("eventos page shows humanized status, correlation and external Stripe link without full ids", async () => {
    const source = await fs.readFile("src/app/admin/eventos/page.tsx", "utf8");
    expect(source).toContain("paymentProcessingStatusHumanLabelPt");
    expect(source).toContain("PAYMENT_EVENT_UNCORRELATED_LABEL");
    expect(source).toContain("PAYMENT_EVENT_AMBIGUOUS_LABEL");
    expect(source).toContain("stripeDashboardHref");
    expect(source).toContain("STRIPE_DASHBOARD_EXTERNAL_LABEL");
    expect(source).toContain("AdminExternalToolLink");
    expect(source).toContain("EXTERNAL_LINK_TARGET");
    expect(source).toContain("EXTERNAL_LINK_REL");
    expect(source).toContain("objectIdMasked");
  });

  it("user detail exposes dashboard hrefs built server-side while keeping display masked", async () => {
    const usersSource = await fs.readFile("src/lib/admin/users.ts", "utf8");
    expect(usersSource).toContain("stripeCustomerDashboardHref");
    expect(usersSource).toContain("stripeSubscriptionDashboardHref");
    expect(usersSource).toContain("buildStripeDashboardSearchUrl");

    const pageSource = await fs.readFile(
      "src/app/admin/usuarios/[userId]/page.tsx",
      "utf8",
    );
    expect(pageSource).toContain("stripeCustomerDashboardHref");
    expect(pageSource).toContain("stripeSubscriptionDashboardHref");
    expect(pageSource).toContain("STRIPE_DASHBOARD_EXTERNAL_LABEL");
  });
});
