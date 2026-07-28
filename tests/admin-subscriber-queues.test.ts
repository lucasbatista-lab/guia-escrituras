import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import {
  classifyAdminTechnicalLookup,
  inactivityThresholdIso,
  parseAdminInactiveDays,
  ADMIN_INACTIVE_DAY_THRESHOLDS,
} from "@/lib/admin/technical-lookup";
import { buildAdminOperationalMilestones } from "@/lib/admin/operational-milestones";
import {
  buildAdminUserListQuery,
  parseAdminUserListSearchParams,
} from "@/lib/admin/user-list-params";

describe("admin technical lookup classification", () => {
  it("classifies each technical format without fuzzy ID matching", () => {
    expect(classifyAdminTechnicalLookup("cus_ABC123").kind).toBe(
      "stripe_customer",
    );
    expect(classifyAdminTechnicalLookup("sub_XYZ999").kind).toBe(
      "stripe_subscription",
    );
    expect(classifyAdminTechnicalLookup("ana@example.com").kind).toBe("email");
    expect(
      classifyAdminTechnicalLookup("11111111-1111-4111-8111-111111111111").kind,
    ).toBe("ambiguous_uuid");
    expect(classifyAdminTechnicalLookup("Maria").kind).toBe("display_name");
    expect(classifyAdminTechnicalLookup("").kind).toBe("empty");
    expect(classifyAdminTechnicalLookup("cus_").kind).toBe("unsupported");
  });

  it("does not treat partial UUIDs as technical IDs", () => {
    expect(classifyAdminTechnicalLookup("11111111-1111").kind).toBe(
      "display_name",
    );
    expect(classifyAdminTechnicalLookup("cus ABC").kind).toBe("display_name");
  });
});

describe("admin operational queues params", () => {
  it("parses queue filters and preserves querystring", () => {
    const filters = parseAdminUserListSearchParams({
      awaiting_confirmation: "1",
      active_no_conversation: "1",
      inactive_days: "7",
      checkout_pending: "1",
    });
    expect(filters.awaitingConfirmationOnly).toBe(true);
    expect(filters.activeNoConversationOnly).toBe(true);
    expect(filters.inactiveDays).toBe(7);
    expect(filters.checkoutPendingOnly).toBe(true);

    const qs = buildAdminUserListQuery(filters);
    expect(qs).toContain("awaiting_confirmation=1");
    expect(qs).toContain("active_no_conversation=1");
    expect(qs).toContain("inactive_days=7");
    expect(qs).toContain("checkout_pending=1");
  });

  it("only accepts continuous inactivity thresholds 3/7/14/30", () => {
    expect(ADMIN_INACTIVE_DAY_THRESHOLDS).toEqual([3, 7, 14, 30]);
    expect(parseAdminInactiveDays("3")).toBe(3);
    expect(parseAdminInactiveDays("7")).toBe(7);
    expect(parseAdminInactiveDays("14")).toBe(14);
    expect(parseAdminInactiveDays("30")).toBe(30);
    expect(parseAdminInactiveDays("2")).toBeUndefined();
    expect(parseAdminInactiveDays("15")).toBeUndefined();

    const now = Date.parse("2026-07-28T15:00:00.000Z");
    const t3 = inactivityThresholdIso(3, now);
    const t7 = inactivityThresholdIso(7, now);
    expect(Date.parse(t3)).toBe(now - 3 * 86_400_000);
    expect(Date.parse(t7)).toBe(now - 7 * 86_400_000);
    expect(Date.parse(t3)).toBeGreaterThan(Date.parse(t7));
  });
});

describe("admin operational milestones", () => {
  it("builds marcos without message content", () => {
    const milestones = buildAdminOperationalMilestones({
      createdAt: "2026-01-01T00:00:00.000Z",
      signupIntentStatus: "awaiting_confirmation",
      checkoutCreatedAt: "2026-01-02T00:00:00.000Z",
      subscriptionCreatedAt: "2026-01-03T00:00:00.000Z",
      subscriptionStatus: "active",
      firstConversationAt: null,
      lastActivityAt: null,
      firstJourneyStartedAt: "2026-01-04T00:00:00.000Z",
      journeyCompletedAt: null,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2026-02-01T00:00:00.000Z",
    });
    expect(milestones.some((m) => m.key === "account_created")).toBe(true);
    expect(
      milestones.find((m) => m.key === "confirmation")?.label,
    ).toContain("Aguardando confirmação conforme fluxo de cadastro");
    expect(milestones.find((m) => m.key === "first_conversation")?.known).toBe(
      false,
    );
    const blob = JSON.stringify(milestones);
    expect(blob).not.toMatch(/messages|content|resumo|espiritual/i);
  });
});

describe("admin subscriber queues UI contracts", () => {
  it("list exposes technical search hint and operational queues", async () => {
    const page = await fs.readFile("src/app/admin/usuarios/page.tsx", "utf8");
    expect(page).toContain("ADMIN_TECHNICAL_SEARCH_HINT");
    expect(page).toContain('name="awaiting_confirmation"');
    expect(page).toContain('name="active_no_conversation"');
    expect(page).toContain('name="inactive_days"');
    expect(page).toContain("Assinou e nunca conversou");
    expect(page).toContain("PARCIAL");
    expect(page).not.toContain('from("messages")');
    expect(page).not.toContain("conversation_summaries");
  });

  it("detail shows Marcos operacionais without private content", async () => {
    const page = await fs.readFile(
      "src/app/admin/usuarios/[userId]/page.tsx",
      "utf8",
    );
    expect(page).toContain("Marcos operacionais");
    expect(page).toContain("operationalMilestones");
    expect(page).not.toContain("timeline completa");
    expect(page).not.toContain('from("messages")');
  });

  it("overview links Filas operacionais without inventing unsafe counts", async () => {
    const page = await fs.readFile("src/app/admin/page.tsx", "utf8");
    expect(page).toContain("Filas operacionais");
    expect(page).toContain("active_no_conversation=1");
    expect(page).toContain("inactive_days=3");
    expect(page).toContain("inactive_days=30");
    expect(page).toContain("awaiting_confirmation=1");
    expect(page).toContain("Assinou e nunca conversou");
  });

  it("users helper resolves technical lookups exactly and skips message tables", async () => {
    const source = await fs.readFile("src/lib/admin/users.ts", "utf8");
    expect(source).toContain("resolveAdminTechnicalLookup");
    expect(source).toContain('eq("stripe_customer_id"');
    expect(source).toContain('eq("stripe_subscription_id"');
    expect(source).toContain('eq("request_id"');
    expect(source).toContain("activeNoConversationOnly");
    expect(source).toContain("awaitingConfirmationOnly");
    expect(source).toContain("TECHNICAL_LOOKUP_RESULT_CAP");
    expect(source).not.toContain('from("messages")');
    expect(source).not.toContain("conversation_summaries");
  });
});
