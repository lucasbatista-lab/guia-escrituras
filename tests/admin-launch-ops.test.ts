import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import {
  maskStripeId,
  subscriptionStatusLabelPt,
} from "@/lib/admin/labels";
import { PAYMENT_EVENT_LEASE_MS } from "@/lib/stripe/payment-event-claim";
import { AppError } from "@/lib/safety";

describe("admin labels", () => {
  it("maps subscription statuses to Portuguese", () => {
    expect(subscriptionStatusLabelPt("active")).toBe("Ativa");
    expect(subscriptionStatusLabelPt("past_due")).toBe("Pagamento em atraso");
    expect(subscriptionStatusLabelPt(null)).toBe("Sem assinatura");
  });

  it("masks Stripe IDs without exposing full values", () => {
    expect(maskStripeId("cus_ABCDEF1234567890")).toBe("cus_ABCD…90");
    expect(maskStripeId("sub_xyz")).toBe("sub_xyz");
    expect(maskStripeId(null)).toBeNull();
  });
});

describe("honest revenue / MRR labels", () => {
  it("keeps catalog MRR distinct from received revenue", async () => {
    const page = await fs.readFile("src/app/admin/page.tsx", "utf8");
    const { formatRevenueBrl } = await import("@/lib/admin/metrics");
    expect(page).toContain("MRR estimado pelo preço de catálogo");
    expect(page).toContain("não é receita recebida");
    expect(page).toContain("Receita real recebida");
    expect(formatRevenueBrl(null)).toBe("Ainda não integrada");
  });
});

describe("admin helper defense-in-depth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("getAdminOverviewMetrics fails without admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));

    const { getAdminOverviewMetrics } = await import("@/lib/admin/metrics");
    await expect(getAdminOverviewMetrics()).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("removed admin loses access on next helper call", async () => {
    const requireAdminUser = vi
      .fn()
      .mockResolvedValueOnce({ userId: "admin-1", isAdmin: true })
      .mockRejectedValueOnce(
        new AppError("forbidden", "forbidden", 403, "Acesso restrito."),
      );

    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser,
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));

    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
      })),
    };

    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => client,
    }));

    const { getStoredDailyReports } = await import("@/lib/admin/metrics");
    await expect(getStoredDailyReports(1)).resolves.toEqual([]);
    await expect(getStoredDailyReports(1)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(requireAdminUser).toHaveBeenCalledTimes(2);
  });

  it("getAdminUsers and getAdminPaymentEvents require admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));

    const { getAdminUsers } = await import("@/lib/admin/users");
    const { getAdminPaymentEvents } = await import("@/lib/admin/metrics");

    await expect(getAdminUsers({})).rejects.toMatchObject({ code: "forbidden" });
    await expect(getAdminPaymentEvents({})).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("admin metrics include launch ops fields", () => {
  it("tracks canceling, ended, no-plan and stuck received lease", async () => {
    const source = await fs.readFile("src/lib/admin/metrics.ts", "utf8");
    expect(source).toContain("cancelingWithAccessCount");
    expect(source).toContain("canceledSubscriptions");
    expect(source).toContain("usersWithoutSubscription");
    expect(source).toContain("paymentEventsReceivedStuck");
    expect(source).toContain("PAYMENT_EVENT_LEASE_MS");
    expect(source).toContain("assertAdminServiceAccess");
    expect(PAYMENT_EVENT_LEASE_MS).toBe(3 * 60 * 1000);
  });
});

describe("admin APIs cache policy", () => {
  it("sets Cache-Control no-store on admin readiness and daily report", async () => {
    const readiness = await fs.readFile(
      "src/app/api/admin/stripe/readiness/route.ts",
      "utf8",
    );
    const daily = await fs.readFile("src/app/api/reports/daily/route.ts", "utf8");
    expect(readiness).toContain('Cache-Control": "no-store"');
    expect(daily).toContain('Cache-Control": "no-store"');
  });
});

describe("admin UX contracts", () => {
  it("overview exposes operational filters and P0/P1 alerts", async () => {
    const page = await fs.readFile("src/app/admin/page.tsx", "utf8");
    expect(page).toContain("/admin/usuarios?status=none");
    expect(page).toContain("/admin/usuarios?canceling=1");
    expect(page).toContain("/admin/usuarios?past_due=1");
    expect(page).toContain("/admin/eventos?status=failed");
    expect(page).toContain("/admin/eventos?status=received_stuck");
    expect(page).toContain("/admin/usuarios?checkout_pending=1");
    expect(page).toContain("P0");
    expect(page).toContain("P1");
    expect(page).not.toContain("messages");
    expect(page).not.toContain("OPENAI_API_KEY");
    expect(page).not.toContain("STRIPE_SECRET");
  });

  it("usuarios page wires canceling and checkout pending filters", async () => {
    const page = await fs.readFile("src/app/admin/usuarios/page.tsx", "utf8");
    expect(page).toContain('name="canceling"');
    expect(page).toContain('name="checkout_pending"');
    expect(page).toContain("subscriptionStatusLabelPt");
    expect(page).toContain("Sem texto de conversas");
    expect(page).not.toContain("from(\"messages\")");
  });

  it("eventos page filters failed and stuck received without payload/secrets", async () => {
    const page = await fs.readFile("src/app/admin/eventos/page.tsx", "utf8");
    expect(page).toContain("received_stuck");
    expect(page).toContain("failed");
    expect(page).toContain("objectIdMasked");
    expect(page).toContain("Sem payload bruto");
    expect(page).not.toContain("raw_body");
    expect(page).not.toContain("STRIPE_SECRET");
    expect(page).not.toContain("from(\"messages\")");
  });

  it("admin helpers are server-only and not imported by client panel", async () => {
    const requireAdmin = await fs.readFile(
      "src/lib/admin/require-admin.ts",
      "utf8",
    );
    const metrics = await fs.readFile("src/lib/admin/metrics.ts", "utf8");
    const users = await fs.readFile("src/lib/admin/users.ts", "utf8");
    const panel = await fs.readFile(
      "src/components/admin/stripe-readiness-panel.tsx",
      "utf8",
    );

    expect(requireAdmin).toContain('import "server-only"');
    expect(metrics).toContain('import "server-only"');
    expect(users).toContain('import "server-only"');
    expect(panel).toContain('"use client"');
    expect(panel).not.toContain("@/lib/admin");
    expect(panel).not.toContain("createAdminClient");
  });
});
