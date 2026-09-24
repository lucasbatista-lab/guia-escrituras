import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Stripe from "stripe";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account/account-deletion-constants";
import {
  deleteAuthenticatedAccount,
  ensureRecurringBillingStoppedForDeletion,
  purgeReferralEdgesForUser,
  setAccountDeletionAdminClientForTests,
  setAccountDeletionBillingStopForTests,
} from "@/lib/account/delete-account";
import { setStripeClientForTests } from "@/lib/stripe/client";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getAuthUserContext: vi.fn(),
  };
});

vi.mock("@/lib/billing/subscription-lookup", () => ({
  loadUserSubscriptions: vi.fn(),
  getEffectiveSubscriptionForUser: vi.fn(),
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getAuthUserContext } from "@/lib/auth";
import { loadUserSubscriptions } from "@/lib/billing/subscription-lookup";
import { POST, GET, DELETE } from "@/app/api/account/delete/route";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const authUserA = {
  userId: USER_A,
  email: "a@example.com",
  demoMode: false,
  planKey: "essencial" as const,
  spiritualProfile: {
    traditionKey: "ecumenical",
    responseStyle: "pastoral",
    preferredDepth: "balanced",
    saintsContentEnabled: false,
    onboardingCompleted: true,
  },
};

function readSrc(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

function makeAdminMock(options?: {
  deleteUserError?: { message?: string; status?: number } | null;
  referralError?: { message: string } | null;
  stripeCustomerId?: string | null;
}) {
  const deleteUser = vi.fn().mockResolvedValue({
    data: null,
    error: options?.deleteUserError ?? null,
  });
  const referralOr = vi.fn().mockResolvedValue({
    error: options?.referralError ?? null,
  });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options?.stripeCustomerId
      ? { stripe_customer_id: options.stripeCustomerId }
      : null,
    error: null,
  });

  return {
    client: {
      auth: { admin: { deleteUser } },
      from: (table: string) => {
        if (table === "referral_attributions") {
          return {
            delete: () => ({ or: referralOr }),
          };
        }
        if (table === "billing_customers") {
          return {
            select: () => ({
              eq: () => ({ maybeSingle }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    },
    deleteUser,
    referralOr,
  };
}

describe("account deletion — authorization", () => {
  afterEach(() => {
    setAccountDeletionAdminClientForTests(null);
    setAccountDeletionBillingStopForTests(null);
    setStripeClientForTests(null);
    vi.resetAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getAuthUserContext).mockResolvedValue(null);
    const res = await POST(
      new Request("https://amemchat.com.br/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://amemchat.com.br",
        },
        body: JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION }),
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("unauthenticated");
  });

  it("ignores forged user_id in body and only deletes session user", async () => {
    vi.mocked(getAuthUserContext).mockResolvedValue(authUserA as never);
    setAccountDeletionBillingStopForTests(async () => ({
      ok: true,
      stoppedCount: 0,
      alreadyStoppedCount: 0,
    }));
    const admin = makeAdminMock();
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const res = await POST(
      new Request("https://amemchat.com.br/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://amemchat.com.br",
        },
        body: JSON.stringify({
          confirmation: ACCOUNT_DELETE_CONFIRMATION,
          user_id: USER_B,
          userId: USER_B,
          email: "b@example.com",
          profile_id: USER_B,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(admin.deleteUser).toHaveBeenCalledTimes(1);
    expect(admin.deleteUser).toHaveBeenCalledWith(USER_A);
    expect(admin.deleteUser).not.toHaveBeenCalledWith(USER_B);
  });

  it("rejects missing confirmation", async () => {
    vi.mocked(getAuthUserContext).mockResolvedValue(authUserA as never);
    const deleteUser = vi.fn();
    setAccountDeletionAdminClientForTests(
      () =>
        ({
          auth: { admin: { deleteUser } },
          from: () => ({
            delete: () => ({ or: vi.fn() }),
            select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }),
          }),
        }) as never,
    );

    const res = await POST(
      new Request("https://amemchat.com.br/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://amemchat.com.br",
        },
        body: JSON.stringify({ confirmation: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("confirmation_required");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rejects wrong confirmation and does not delete", async () => {
    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: "DELETE",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("proceeds with correct confirmation", async () => {
    setAccountDeletionBillingStopForTests(async () => ({
      ok: true,
      stoppedCount: 0,
      alreadyStoppedCount: 0,
    }));
    const admin = makeAdminMock();
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(true);
    expect(admin.deleteUser).toHaveBeenCalledWith(USER_A);
    expect(admin.referralOr).toHaveBeenCalled();
  });

  it("rejects cross-origin POST", async () => {
    vi.mocked(getAuthUserContext).mockResolvedValue(authUserA as never);
    const res = await POST(
      new Request("https://amemchat.com.br/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ confirmation: ACCOUNT_DELETE_CONFIRMATION }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("does not allow GET or DELETE without confirmation body contract", async () => {
    expect((await GET()).status).toBe(405);
    expect((await DELETE()).status).toBe(405);
  });
});

describe("account deletion — billing", () => {
  afterEach(() => {
    setAccountDeletionAdminClientForTests(null);
    setAccountDeletionBillingStopForTests(null);
    setStripeClientForTests(null);
    vi.resetAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("succeeds with no subscription without calling Stripe cancel", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(loadUserSubscriptions).mockResolvedValue([]);
    const admin = makeAdminMock({ stripeCustomerId: null });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const retrieve = vi.fn();
    const update = vi.fn();
    setStripeClientForTests({
      subscriptions: { retrieve, update, list: vi.fn() },
    } as unknown as Stripe);

    const billing = await ensureRecurringBillingStoppedForDeletion(USER_A);
    expect(billing.ok).toBe(true);
    if (billing.ok) {
      expect(billing.stoppedCount).toBe(0);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("cancels active renewal before auth delete (call order)", async () => {
    const order: string[] = [];
    setAccountDeletionBillingStopForTests(async () => {
      order.push("billing");
      return { ok: true, stoppedCount: 1, alreadyStoppedCount: 0 };
    });
    const admin = makeAdminMock();
    admin.deleteUser.mockImplementation(async () => {
      order.push("auth");
      return { data: null, error: null };
    });
    admin.referralOr.mockImplementation(async () => {
      order.push("referral");
      return { error: null };
    });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(true);
    expect(order).toEqual(["billing", "referral", "auth"]);
  });

  it("active Stripe subscription gets cancel_at_period_end", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(loadUserSubscriptions).mockResolvedValue([
      {
        id: "local-1",
        userId: USER_A,
        planKey: "profundo",
        status: "active",
        stripeSubscriptionId: "sub_active123456",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-10-01T00:00:00.000Z",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
    const admin = makeAdminMock({ stripeCustomerId: "cus_x" });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const retrieve = vi.fn().mockResolvedValue({
      id: "sub_active123456",
      status: "active",
      cancel_at_period_end: false,
    });
    const update = vi.fn().mockResolvedValue({
      id: "sub_active123456",
      status: "active",
      cancel_at_period_end: true,
    });
    const list = vi.fn().mockResolvedValue({ data: [] });
    const cancel = vi.fn();
    setStripeClientForTests({
      subscriptions: { retrieve, update, list, cancel },
    } as unknown as Stripe);

    const billing = await ensureRecurringBillingStoppedForDeletion(USER_A);
    expect(billing.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("sub_active123456", {
      cancel_at_period_end: true,
    });
    expect(cancel).not.toHaveBeenCalled();
  });

  it("already canceled subscription allows deletion", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(loadUserSubscriptions).mockResolvedValue([
      {
        id: "local-1",
        userId: USER_A,
        planKey: "profundo",
        status: "canceled",
        stripeSubscriptionId: "sub_canceled123",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ]);
    const admin = makeAdminMock({ stripeCustomerId: null });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const update = vi.fn();
    setStripeClientForTests({
      subscriptions: { retrieve: vi.fn(), update, list: vi.fn() },
    } as unknown as Stripe);

    const billing = await ensureRecurringBillingStoppedForDeletion(USER_A);
    expect(billing.ok).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("past_due Stripe subscription is stopped via cancel_at_period_end", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    vi.mocked(loadUserSubscriptions).mockResolvedValue([
      {
        id: "local-1",
        userId: USER_A,
        planKey: "caminho",
        status: "past_due",
        stripeSubscriptionId: "sub_pastdue12345",
        stripeCustomerId: "cus_x",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    const admin = makeAdminMock({ stripeCustomerId: "cus_x" });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const retrieve = vi.fn().mockResolvedValue({
      id: "sub_pastdue12345",
      status: "past_due",
      cancel_at_period_end: false,
    });
    const update = vi.fn().mockResolvedValue({
      id: "sub_pastdue12345",
      status: "past_due",
      cancel_at_period_end: true,
    });
    const list = vi.fn().mockResolvedValue({ data: [] });
    setStripeClientForTests({
      subscriptions: { retrieve, update, list },
    } as unknown as Stripe);

    const billing = await ensureRecurringBillingStoppedForDeletion(USER_A);
    expect(billing.ok).toBe(true);
    expect(update).toHaveBeenCalledWith("sub_pastdue12345", {
      cancel_at_period_end: true,
    });
  });

  it("cancellation failure does not delete auth", async () => {
    setAccountDeletionBillingStopForTests(async () => ({
      ok: false,
      code: "subscription_cancel_failed",
      message: "fail",
    }));
    const admin = makeAdminMock();
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("subscription_cancel_failed");
    expect(admin.deleteUser).not.toHaveBeenCalled();
    expect(admin.referralOr).not.toHaveBeenCalled();
  });
});

describe("account deletion — failure order and idempotency", () => {
  afterEach(() => {
    setAccountDeletionAdminClientForTests(null);
    setAccountDeletionBillingStopForTests(null);
    vi.resetAllMocks();
  });

  it("referral purge failure does not call auth delete", async () => {
    setAccountDeletionBillingStopForTests(async () => ({
      ok: true,
      stoppedCount: 0,
      alreadyStoppedCount: 0,
    }));
    const admin = makeAdminMock({
      referralError: { message: "fk_block" },
    });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("deletion_failed");
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });

  it("auth deletion failure returns typed error (no false success)", async () => {
    setAccountDeletionBillingStopForTests(async () => ({
      ok: true,
      stoppedCount: 0,
      alreadyStoppedCount: 0,
    }));
    const admin = makeAdminMock({
      deleteUserError: { message: "service unavailable", status: 500 },
    });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("deletion_failed");
  });

  it("auth already absent after billing is treated as success (idempotent)", async () => {
    setAccountDeletionBillingStopForTests(async () => ({
      ok: true,
      stoppedCount: 0,
      alreadyStoppedCount: 1,
    }));
    const admin = makeAdminMock({
      deleteUserError: { message: "User not found", status: 404 },
    });
    setAccountDeletionAdminClientForTests(() => admin.client as never);

    const result = await deleteAuthenticatedAccount({
      userId: USER_A,
      confirmation: ACCOUNT_DELETE_CONFIRMATION,
    });
    expect(result.ok).toBe(true);
  });

  it("purgeReferralEdges targets both referrer and referred roles", async () => {
    const admin = makeAdminMock();
    await purgeReferralEdgesForUser(USER_A, admin.client as never);
    expect(admin.referralOr).toHaveBeenCalledWith(
      `referrer_user_id.eq.${USER_A},referred_user_id.eq.${USER_A}`,
    );
  });
});

describe("account deletion — schema / data graph contracts", () => {
  it("documents CASCADE for must-delete personal tables and NO ACTION referral gap", () => {
    const foundation = readSrc(
      "supabase",
      "migrations",
      "20260712000001_foundation_schema.sql",
    );
    const daily = readSrc(
      "supabase",
      "migrations",
      "20260920000014_user_daily_interactions_and_product_events.sql",
    );
    const workspace = readSrc(
      "supabase",
      "migrations",
      "20260920000015_personal_spiritual_workspace.sql",
    );
    const journey = readSrc(
      "supabase",
      "migrations",
      "20260712000008_journey_progress.sql",
    );

    expect(foundation).toMatch(
      /profiles[\s\S]*references auth\.users\s*\(id\)\s+on delete cascade/i,
    );
    expect(foundation).toMatch(
      /conversations[\s\S]*user_id[\s\S]*on delete cascade/i,
    );
    expect(foundation).toMatch(
      /messages[\s\S]*user_id[\s\S]*on delete cascade/i,
    );
    expect(workspace).toMatch(
      /user_prayers[\s\S]*on delete cascade/i,
    );
    expect(workspace).toMatch(
      /user_private_entries[\s\S]*on delete cascade/i,
    );
    expect(workspace).toMatch(
      /user_saved_items[\s\S]*on delete cascade/i,
    );
    expect(daily).toMatch(
      /user_daily_interactions[\s\S]*on delete cascade/i,
    );
    expect(daily).toMatch(/product_events[\s\S]*on delete cascade/i);
    expect(journey).toMatch(
      /journey_progress[\s\S]*on delete cascade/i,
    );

    // Gap handled in app: referral_attributions has no ON DELETE CASCADE.
    const attributionBlock = foundation.slice(
      foundation.indexOf("create table public.referral_attributions"),
      foundation.indexOf("create table public.referral_rewards"),
    );
    expect(attributionBlock).toContain("referrer_user_id");
    expect(attributionBlock).not.toMatch(
      /referrer_user_id[\s\S]{0,80}on delete cascade/i,
    );

    const deleteSvc = readSrc("src", "lib", "account", "delete-account.ts");
    expect(deleteSvc).toContain("purgeReferralEdgesForUser");
    expect(deleteSvc).toContain("referral_attributions");
    expect(deleteSvc).toContain("cancel_at_period_end");
  });
});

describe("account deletion — Conta UI contracts", () => {
  it("exposes Excluir conta on Conta with confirmation and export link", () => {
    const conta = readSrc("src", "app", "(platform)", "conta", "page.tsx");
    const panel = readSrc(
      "src",
      "components",
      "account",
      "account-deletion-panel.tsx",
    );
    const success = readSrc(
      "src",
      "app",
      "(marketing)",
      "conta-excluida",
      "page.tsx",
    );

    expect(conta).toContain("AccountDeletionPanel");
    expect(conta).toContain('title="Excluir conta"');
    expect(conta).toContain('id="exportar-dados"');

    expect(panel).toContain("Excluir conta");
    expect(panel).toContain('role="dialog"');
    expect(panel).toContain("aria-modal");
    expect(panel).toContain("ACCOUNT_DELETE_CONFIRMATION");
    expect(readSrc("src", "lib", "account", "account-deletion-constants.ts")).toContain(
      '"EXCLUIR"',
    );
    expect(panel).toContain("Excluindo…");
    expect(panel).toContain("disabled={pending || !confirmationMatches}");
    expect(panel).toContain("baixe seus dados");
    expect(panel).toContain("/api/account/delete");
    expect(panel).toContain("/conta-excluida");
    expect(panel).toContain("signOut");
    expect(panel).toContain("min-h-11");
    expect(panel).toContain("Escape");

    expect(success).toContain("Conta excluída");
    expect(success).toContain("Ir para o início");
  });

  it("delete route never trusts client user identity fields", () => {
    const route = readSrc("src", "app", "api", "account", "delete", "route.ts");
    expect(route).toContain("void record.userId");
    expect(route).toContain("void record.user_id");
    expect(route).toContain("void record.email");
    expect(route).toContain("auth.userId");
    expect(route).not.toContain("record.userId as string");
  });
});
