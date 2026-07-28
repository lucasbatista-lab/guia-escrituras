import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { AppError } from "@/lib/safety";
import {
  ADMIN_USER_CSV_MAX_ROWS,
  buildAdminUserDetailHref,
  buildAdminUserListQuery,
  parseAdminDateParam,
  parseAdminUserListSearchParams,
  resolveAdminUsersReturnHref,
} from "@/lib/admin/user-list-params";
import { maskStripeId } from "@/lib/admin/labels";

describe("admin user list params", () => {
  it("normalizes search, plan, status, sort, pageSize and dates", () => {
    const filters = parseAdminUserListSearchParams({
      q: "  Ana  ",
      plan: "caminho",
      status: "trialing",
      sort: "created_asc",
      pageSize: "50",
      page: "2",
      utm: "Share",
      utm_medium: "Email",
      utm_content: "Banner-A",
      created_from: "2026-01-01",
      created_to: "2026-01-31",
      canceling: "1",
    });
    expect(filters.q).toBe("Ana");
    expect(filters.planKey).toBe("caminho");
    expect(filters.subscriptionStatus).toBe("trialing");
    expect(filters.sort).toBe("created_asc");
    expect(filters.pageSize).toBe(50);
    expect(filters.page).toBe(2);
    expect(filters.utmSource).toBe("share");
    expect(filters.utmMedium).toBe("email");
    expect(filters.utmContent).toBe("banner-a");
    expect(filters.createdFrom).toBe(parseAdminDateParam("2026-01-01", "start"));
    expect(filters.createdTo).toBe(parseAdminDateParam("2026-01-31", "end"));
    expect(filters.cancelingOnly).toBe(true);
  });

  it("rejects dangerous utm and invalid dates", () => {
    const filters = parseAdminUserListSearchParams({
      utm: "foo;drop",
      utm_medium: "x<script>",
      utm_content: "ok_value",
      created_from: "01/01/2026",
      pageSize: "999",
      status: "hacked",
    });
    expect(filters.utmSource).toBeUndefined();
    expect(filters.utmMedium).toBeUndefined();
    expect(filters.utmContent).toBe("ok_value");
    expect(filters.createdFrom).toBeUndefined();
    expect(filters.pageSize).toBe(25);
    expect(filters.subscriptionStatus).toBe("any");
  });

  it("preserves filters in query builder", () => {
    const qs = buildAdminUserListQuery({
      q: "a@b.c",
      planKey: "essencial",
      subscriptionStatus: "active",
      utmSource: "share",
      utmMedium: "email",
      utmContent: "banner",
      sort: "created_asc",
      pageSize: 50,
      page: 3,
      pastDueOnly: true,
      duplicatesOnly: true,
      checkoutPendingOnly: true,
      onboardingCompleted: "no",
    });
    expect(qs).toContain("q=a%40b.c");
    expect(qs).toContain("plan=essencial");
    expect(qs).toContain("status=active");
    expect(qs).toContain("utm=share");
    expect(qs).toContain("utm_medium=email");
    expect(qs).toContain("utm_content=banner");
    expect(qs).toContain("sort=created_asc");
    expect(qs).toContain("pageSize=50");
    expect(qs).toContain("page=3");
    expect(qs).toContain("past_due=1");
    expect(qs).toContain("duplicates=1");
    expect(qs).toContain("checkout_pending=1");
    expect(qs).toContain("onboarding=no");
  });

  it("serializes and validates return query for detail back-link", () => {
    const filters = parseAdminUserListSearchParams({
      q: "cus_test",
      status: "past_due",
      page: "2",
      canceling: "1",
      utm: "share",
    });
    const detailHref = buildAdminUserDetailHref(
      "11111111-1111-4111-8111-111111111111",
      filters,
    );
    expect(detailHref).toContain("/admin/usuarios/11111111-1111-4111-8111-111111111111?");
    expect(detailHref).toContain("return=");

    const returnEncoded = new URL(detailHref, "https://example.local").searchParams.get(
      "return",
    );
    expect(returnEncoded).toBeTruthy();
    const back = resolveAdminUsersReturnHref(returnEncoded ?? undefined);
    expect(back.startsWith("/admin/usuarios?")).toBe(true);
    expect(back).toContain("status=past_due");
    expect(back).toContain("canceling=1");
    expect(back).toContain("utm=share");
    expect(back).toContain("page=2");
    expect(back).toContain("q=cus_test");
  });

  it("rejects hostile return params and keeps admin allowlist only", () => {
    expect(resolveAdminUsersReturnHref("https://evil.example/phish")).toBe(
      "/admin/usuarios",
    );
    expect(resolveAdminUsersReturnHref("//evil.example")).toBe("/admin/usuarios");
    expect(resolveAdminUsersReturnHref("/entrar?next=/admin")).toBe(
      "/admin/usuarios",
    );
    expect(resolveAdminUsersReturnHref("/admin/usuarios?status=hacked")).toBe(
      "/admin/usuarios",
    );
    expect(
      resolveAdminUsersReturnHref("/admin/usuarios?status=active&past_due=1"),
    ).toBe("/admin/usuarios?status=active&past_due=1");
    expect(resolveAdminUsersReturnHref("status=active&foo=bar")).toBe(
      "/admin/usuarios?status=active",
    );
  });

  it("caps CSV export size", () => {
    expect(ADMIN_USER_CSV_MAX_ROWS).toBe(500);
    expect(ADMIN_USER_CSV_MAX_ROWS).toBeLessThanOrEqual(500);
  });
});

describe("admin subscriber ops access control", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("getAdminUsers rejects unauthenticated / non-admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("unauthorized", "unauthorized", 401, "Entre novamente.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    const { getAdminUsers } = await import("@/lib/admin/users");
    await expect(getAdminUsers({})).rejects.toMatchObject({
      code: "unauthorized",
      status: 401,
    });
  });

  it("exportAdminUsersCsv rejects non-admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    const { exportAdminUsersCsv } = await import("@/lib/admin/users");
    await expect(exportAdminUsersCsv({})).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("getAdminUserDetail rejects non-admin", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    const { getAdminUserDetail } = await import("@/lib/admin/users");
    await expect(
      getAdminUserDetail("11111111-1111-4111-8111-111111111111"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("admin subscriber ops UI contracts", () => {
  it("usuarios list supports acquisition, period, sort, pageSize and CSV", async () => {
    const page = await fs.readFile("src/app/admin/usuarios/page.tsx", "utf8");
    expect(page).toContain('name="utm"');
    expect(page).toContain('name="created_from"');
    expect(page).toContain('name="created_to"');
    expect(page).toContain('name="sort"');
    expect(page).toContain('name="pageSize"');
    expect(page).toContain("/api/admin/usuarios/export");
    expect(page).toContain("parseAdminUserListSearchParams");
    expect(page).toContain("Sem texto de conversas");
    expect(page).not.toContain('from("messages")');
  });

  it("user detail exposes masked Stripe ids, usage windows and shortcuts", async () => {
    const page = await fs.readFile(
      "src/app/admin/usuarios/[userId]/page.tsx",
      "utf8",
    );
    expect(page).toContain("stripeCustomerIdMasked");
    expect(page).toContain("stripeSubscriptionIdMasked");
    expect(page).toContain("usageRequests7d");
    expect(page).toContain("conversationCount");
    expect(page).toContain("cancelAtPeriodEnd");
    expect(page).toContain("resolveAdminUsersReturnHref");
    expect(page).toContain("Voltar para usuários");
    expect(page).toContain("/admin/eventos");
    expect(page).toContain("/admin/uso");
    expect(page).toContain("/admin/aquisicao");
    expect(page).not.toContain("document.referrer");
    expect(page).not.toContain("stripe_customer_id");
    expect(page).not.toContain("stripe_subscription_id");
    expect(page).not.toContain('from("messages")');
    expect(page).not.toContain(".content");
  });

  it("list detail links preserve operational querystring", async () => {
    const page = await fs.readFile("src/app/admin/usuarios/page.tsx", "utf8");
    expect(page).toContain("buildAdminUserDetailHref");
    expect(page).not.toMatch(/href=\{`\/admin\/usuarios\/\$\{user\.userId\}`\}/);
  });

  it("parceiros surfaces partial read quality", async () => {
    const page = await fs.readFile("src/app/admin/parceiros/page.tsx", "utf8");
    expect(page).toContain("data.partial");
    expect(page).toContain("PARCIAL");
    expect(page).toContain("não é o total completo");
  });

  it("admin error shows only safe technical digest", async () => {
    const page = await fs.readFile("src/app/admin/error.tsx", "utf8");
    expect(page).toContain("error.digest");
    expect(page).toContain("Identificador técnico");
    expect(page).toContain("Copiar identificador");
    expect(page).toContain("Tentar de novo");
    expect(page).not.toContain("stack");
    expect(page).not.toContain("error.message");
    expect(page).not.toContain("error.stack");
    expect(page).not.toContain("cookie");
    expect(page).not.toContain("Authorization");
  });

  it("CSV route is admin-protected and no-store", async () => {
    const route = await fs.readFile(
      "src/app/api/admin/usuarios/export/route.ts",
      "utf8",
    );
    expect(route).toContain("requireAdminUser");
    expect(route).toContain("exportAdminUsersCsv");
    expect(route).toContain('Cache-Control": "no-store"');
    expect(route).toContain("text/csv");
    expect(route).not.toContain("messages");
    expect(route).not.toContain("OPENAI_API_KEY");
  });

  it("overview includes trialing, conversion and subscriber origins", async () => {
    const page = await fs.readFile("src/app/admin/page.tsx", "utf8");
    const metrics = await fs.readFile("src/lib/admin/metrics.ts", "utf8");
    expect(page).toContain("trialingSubscriberUsers");
    expect(page).toContain("signupToSubscriberRate");
    expect(page).toContain("subscribersByUtmSource");
    expect(page).toContain("utm_source");
    expect(metrics).toContain("trialingSubscriberUsers");
    expect(metrics).toContain("signupToSubscriberRate");
    expect(metrics).toContain("subscribersByUtmSource");
    expect(metrics).toContain("mrrIsCatalogEstimate: true");
    expect(metrics).toContain("realRevenueBrlCents: null");
  });

  it("masked Stripe ids never equal full secrets", () => {
    const full = "cus_ABCDEF1234567890ZZZZ";
    const masked = maskStripeId(full);
    expect(masked).not.toBe(full);
    expect(masked).toContain("…");
    expect(masked?.startsWith("cus_")).toBe(true);
  });
});
