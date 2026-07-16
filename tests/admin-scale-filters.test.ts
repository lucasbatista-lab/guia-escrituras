import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/safety";
import {
  buildUserSubscriptionViews,
  matchesAdminUserFilters,
} from "@/lib/admin/user-filter-index";
import {
  fetchAllRowsPaginated,
  paginateSortedIds,
} from "@/lib/admin/paginate";
import { selectEffectiveSubscriptionsByUser } from "@/lib/billing/effective-subscription";

describe("admin pagination helpers", () => {
  it("fetches beyond the PostgREST 1000-row default without silent truncation", async () => {
    const total = 1205;
    let calls = 0;
    const result = await fetchAllRowsPaginated<{ id: number }>(
      async (from, to) => {
        calls += 1;
        const data = [];
        for (let i = from; i <= to && i < total; i += 1) {
          data.push({ id: i });
        }
        return { data, error: null };
      },
      { pageSize: 1000, maxPages: 5 },
    );
    expect(result.rows).toHaveLength(1205);
    expect(result.partial).toBe(false);
    expect(calls).toBe(2);
  });

  it("paginateSortedIds returns stable pages and real totals", () => {
    const ids = Array.from({ length: 250 }, (_, i) => `u-${String(i).padStart(3, "0")}`);
    const page1 = paginateSortedIds(ids, 1, 25);
    const page2 = paginateSortedIds(ids, 2, 25);
    const page10 = paginateSortedIds(ids, 10, 25);
    expect(page1.total).toBe(250);
    expect(page1.pageIds).toHaveLength(25);
    expect(page1.pageIds[0]).toBe("u-000");
    expect(page2.pageIds[0]).toBe("u-025");
    expect(page10.pageIds).toHaveLength(25);
    expect(page10.pageIds[0]).toBe("u-225");
  });
});

describe("admin user filter index", () => {
  const live = Array.from({ length: 250 }, (_, i) => ({
    id: `sub-${i}`,
    userId: `user-${i}`,
    planKey: (i % 2 === 0 ? "essencial" : "caminho") as const,
    status: "active" as const,
    stripeCustomerId: `cus_${i}`,
    stripeSubscriptionId: `sub_${i}`,
    currentPeriodEnd: "2026-08-01T00:00:00Z",
    createdAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
  }));

  // Duplicate live subs for users 0..4
  live.push(
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `sub-dup-${i}`,
      userId: `user-${i}`,
      planKey: "profundo" as const,
      status: "active" as const,
      stripeCustomerId: `cus_${i}`,
      stripeSubscriptionId: `sub_dup_${i}`,
      currentPeriodEnd: "2026-09-01T00:00:00Z",
      createdAt: "2026-02-01T00:00:00Z",
    })),
  );

  const pastDue = new Set(
    Array.from({ length: 30 }, (_, i) => `user-${200 + i}`),
  );

  it("indexes >200 users and matches past_due / duplicates across pages", () => {
    const views = buildUserSubscriptionViews(live, pastDue);
    expect(views.size).toBeGreaterThan(200);

    const pastDueMatches = [...views.values()].filter((v) =>
      matchesAdminUserFilters(v, true, { pastDueOnly: true }),
    );
    expect(pastDueMatches).toHaveLength(30);

    const dupMatches = [...views.values()].filter((v) =>
      matchesAdminUserFilters(v, true, { duplicatesOnly: true }),
    );
    expect(dupMatches).toHaveLength(5);

    const noneAmongIndexed = Array.from({ length: 250 }, (_, i) => `user-${i}`)
      .map((id) => views.get(id))
      .filter((v) =>
        matchesAdminUserFilters(v, null, { subscriptionStatus: "none" }),
      );
    // Every user-0..249 is live and/or past_due in the index.
    expect(noneAmongIndexed).toHaveLength(0);

    const page = paginateSortedIds(
      pastDueMatches.map((v) => v.userId).sort(),
      2,
      10,
    );
    expect(page.total).toBe(30);
    expect(page.pageIds).toHaveLength(10);
  });

  it("matches sem assinatura when view is missing", () => {
    expect(
      matchesAdminUserFilters(undefined, false, {
        subscriptionStatus: "none",
      }),
    ).toBe(true);
    expect(
      matchesAdminUserFilters(
        {
          userId: "u",
          planKey: "essencial",
          subscriptionStatus: "active",
          hasDuplicateSubscriptions: false,
          isPastDue: false,
        },
        true,
        { subscriptionStatus: "none" },
      ),
    ).toBe(false);
  });

  it("matches personalização pendente (onboarding=no)", () => {
    expect(
      matchesAdminUserFilters(
        {
          userId: "u",
          planKey: "caminho",
          subscriptionStatus: "active",
          hasDuplicateSubscriptions: false,
          isPastDue: false,
        },
        false,
        { onboardingCompleted: "no" },
      ),
    ).toBe(true);
    expect(
      matchesAdminUserFilters(
        {
          userId: "u",
          planKey: "caminho",
          subscriptionStatus: "active",
          hasDuplicateSubscriptions: false,
          isPastDue: false,
        },
        true,
        { onboardingCompleted: "no" },
      ),
    ).toBe(false);
  });
});

describe("admin metrics scale (>1000 subscriptions / referrals)", () => {
  it("deduplicates MRR across >1000 live subscription rows", () => {
    const candidates = Array.from({ length: 1200 }, (_, i) => ({
      id: `s-${i}`,
      userId: `u-${i % 1100}`,
      planKey: "essencial" as const,
      status: "active" as const,
      stripeSubscriptionId: `sub_${i}`,
      createdAt: "2026-01-01T00:00:00Z",
    }));
    const { effective, usersWithDuplicates } =
      selectEffectiveSubscriptionsByUser(candidates);
    expect(effective.length).toBe(1100);
    expect(usersWithDuplicates).toBe(100);
  });

  it("fetchLiveSubscriptionCandidates pages beyond 1000", async () => {
    vi.resetModules();
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      id: `id-${i}`,
      user_id: `user-${i}`,
      plan_key: "essencial",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: `sub_${i}`,
      current_period_end: null,
      created_at: "2026-01-01T00:00:00Z",
    }));
    let rangeCalls = 0;
    const client = {
      from: () => ({
        select: () => ({
          in: () => ({
            order: () => ({
              order: () => ({
                range: (from: number, to: number) => {
                  rangeCalls += 1;
                  return Promise.resolve({
                    data: rows.slice(from, to + 1),
                    error: null,
                  });
                },
              }),
            }),
          }),
        }),
      }),
    };

    const { fetchLiveSubscriptionCandidates } = await import(
      "@/lib/admin/metrics"
    );
    const result = await fetchLiveSubscriptionCandidates(client as never);
    expect(result.candidates).toHaveLength(1500);
    expect(result.partial).toBe(false);
    expect(rangeCalls).toBeGreaterThanOrEqual(2);
  });

  it("referral status counts use head/count (not unbounded select)", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/admin/metrics.ts", "utf8"),
    );
    expect(source).toContain("countReferralStatus");
    expect(source).toContain('count: "exact", head: true');
    expect(source).toContain("fetchLiveSubscriptionCandidates");
    expect(source).not.toMatch(
      /referral_attributions"\)\s*\.select\("status"\)\s*;/,
    );
  });
});

describe("getAdminUsers scale + no Auth N+1", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("rejects non-admin callers", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => {
        throw new AppError("forbidden", "forbidden", 403, "Acesso restrito.");
      }),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    const { getAdminUsers } = await import("@/lib/admin/users");
    await expect(getAdminUsers({ pastDueOnly: true })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("past_due filter paginates beyond 200 with real total and no getUserById", async () => {
    const getUserById = vi.fn();
    const listUsers = vi.fn();

    const profiles = Array.from({ length: 300 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      display_name: `User ${i}`,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    }));
    const pastDueSubs = profiles.slice(0, 250).map((p, i) => ({
      user_id: p.id,
      // satisfy order
      _i: i,
    }));

    function chain(result: unknown) {
      const api: Record<string, unknown> = {};
      const self = new Proxy(api, {
        get(target, prop) {
          if (prop === "then") {
            return (resolve: (v: unknown) => unknown) =>
              Promise.resolve(result).then(resolve);
          }
          if (typeof prop === "string") {
            target[prop] =
              target[prop] ??
              vi.fn(() => self);
            return target[prop];
          }
          return undefined;
        },
      });
      return self;
    }

    const client = {
      auth: { admin: { getUserById, listUsers } },
      from: (table: string) => {
        if (table === "subscriptions") {
          return {
            select: vi.fn((cols: string) => {
              if (cols === "user_id") {
                return {
                  eq: () => ({
                    order: () => ({
                      range: (from: number, to: number) =>
                        Promise.resolve({
                          data: pastDueSubs.slice(from, to + 1),
                          error: null,
                        }),
                    }),
                  }),
                };
              }
              return {
                in: () => ({
                  order: () => ({
                    order: () => ({
                      range: () =>
                        Promise.resolve({ data: [], error: null }),
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === "spiritual_profiles") {
          return {
            select: () => ({
              order: () => ({
                range: () => Promise.resolve({ data: [], error: null }),
              }),
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              order: () => ({
                order: () => ({
                  range: (from: number, to: number) =>
                    Promise.resolve({
                      data: profiles.slice(from, to + 1),
                      error: null,
                      count: profiles.length,
                    }),
                }),
              }),
              in: (col: string, ids: string[]) => {
                void col;
                const set = new Set(ids);
                const matched = profiles.filter((p) => set.has(p.id));
                return Promise.resolve({ data: matched, error: null });
              },
            }),
          };
        }
        return {
          select: () => chain({ data: [], error: null }),
        };
      },
    };

    vi.doMock("@/lib/auth/session", () => ({
      requireAdminUser: vi.fn(async () => ({
        userId: "admin",
        isAdmin: true,
      })),
      requireAuthUser: vi.fn(),
      getAuthUserContext: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => client,
    }));

    const { getAdminUsers } = await import("@/lib/admin/users");
    const page1 = await getAdminUsers({
      pastDueOnly: true,
      page: 1,
      pageSize: 25,
    });
    const page2 = await getAdminUsers({
      pastDueOnly: true,
      page: 2,
      pageSize: 25,
    });

    expect(page1.total).toBe(250);
    expect(page1.rows).toHaveLength(25);
    expect(page2.rows).toHaveLength(25);
    expect(page1.rows[0]?.userId).not.toBe(page2.rows[0]?.userId);
    expect(getUserById).not.toHaveBeenCalled();
    expect(listUsers).not.toHaveBeenCalled();
  });
});

describe("admin users source contracts for scale", () => {
  it("removes the implicit 200 post-filter window", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/lib/admin/users.ts", "utf8"),
    );
    expect(source).not.toContain("needsPostFilter");
    expect(source).not.toContain("fetchSize = needsPostFilter ? 200");
    expect(source).toContain("fetchAllRowsPaginated");
    expect(source).toContain("buildUserSubscriptionViews");
    expect(source).toContain("paginateSortedIds");
  });
});
