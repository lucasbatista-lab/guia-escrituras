import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveChatClientError } from "@/lib/ai/chat-client-errors";
import {
  mapJourneyCompleteError,
  mapJourneyCompleteNetworkError,
} from "@/lib/journeys/complete-client-errors";
import {
  buildConversasListHref,
  sanitizeHistorySearchQuery,
} from "@/lib/conversations/history-list";
import { buildOperationalAlerts } from "@/lib/admin/operational-alerts";

const root = process.cwd();

function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("sprint 4 chat concurrency guards", () => {
  it("clears deepen preference on deep_not_entitled", () => {
    const view = resolveChatClientError({
      status: 403,
      code: "deep_response_not_entitled",
    });
    expect(view.clearDeepPreference).toBe(true);
    expect(view.kind).toBe("deep_not_entitled");
  });

  it("remounts ChatPanel by conversation and aborts in-flight sends", () => {
    const page = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    const panel = readSrc("src", "components", "chat", "chat-panel.tsx");
    expect(page).toContain('key={conversationId}');
    expect(page).toContain('key="new"');
    expect(panel).toContain("AbortController");
    expect(panel).toContain("sendGenerationRef");
    expect(panel).toContain("signal: abortController.signal");
  });

  it("keeps deepen help outside the checkbox label", () => {
    const panel = readSrc("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("Será aprofundado:");
    const labelBlock = panel.match(
      /htmlFor=\{deepenId\}[\s\S]*?<\/label>/,
    )?.[0];
    expect(labelBlock).toBeTruthy();
    expect(labelBlock).not.toContain("Será aprofundado:");
    expect(labelBlock).not.toContain("Peça uma reflexão mais ampla");
  });
});

describe("sprint 4 journey complete negatives", () => {
  it("maps 401/403/network without marking success", () => {
    expect(mapJourneyCompleteError({ status: 401 })).toMatch(/sessão/i);
    expect(
      mapJourneyCompleteError({
        status: 403,
        code: "journeys_not_entitled",
      }),
    ).toMatch(/plano/i);
    expect(mapJourneyCompleteNetworkError()).toMatch(/tente de novo/i);
    const button = readSrc(
      "src",
      "components",
      "journeys",
      "journey-step-complete-button.tsx",
    );
    expect(button).toContain("mapJourneyCompleteError");
    expect(button).toContain("setJustCompleted(false)");
  });
});

describe("sprint 4 history retention V3", () => {
  it("sanitizes and preserves local search across load-more", () => {
    expect(sanitizeHistorySearchQuery('<b>paz</b>')).toBe("paz");
    expect(sanitizeHistorySearchQuery("a".repeat(200)).length).toBe(80);
    expect(
      buildConversasListHref({ expanded: true, query: "ansiedade" }),
    ).toBe("/conversas?mais=1&q=ansiedade");
    const page = readSrc("src", "app", "(platform)", "conversas", "page.tsx");
    expect(page).toContain("initialQuery");
    expect(page).toContain("atHardCap");
    expect(page).toContain("buildConversasListHref");
  });
});

describe("sprint 4 admin alert severity order", () => {
  it("lists critical alerts before attention", () => {
    const alerts = buildOperationalAlerts({
      paymentEventsReceivedStuck: 2,
      paymentEventsFailed: 0,
      pastDueSubscriptions: 0,
      checkoutsStuckOver30m: 0,
      usersWithDuplicateSubscriptions: 0,
      cancelingWithAccessCount: null,
      yesterdayReportPresent: false,
      yesterdayReportDate: "2026-07-20",
      activeSubscriberUsers: 1,
      aiRequestsToday: 0,
    });
    const criticalIdx = alerts.findIndex((a) => a.level === "critical");
    const attentionIdx = alerts.findIndex((a) => a.level === "attention");
    expect(criticalIdx).toBeGreaterThanOrEqual(0);
    expect(attentionIdx).toBeGreaterThanOrEqual(0);
    expect(criticalIdx).toBeLessThan(attentionIdx);
  });
});

describe("sprint 4 onboarding activation", () => {
  it("sends first conversation after personalizar", () => {
    const form = readSrc("src", "components", "auth", "onboarding-form.tsx");
    expect(form).toContain('router.push("/conversar")');
    expect(form).not.toContain('router.push("/inicio")');
  });
});

describe("sprint 4 subscription lookup cache", () => {
  it("wraps loadUserSubscriptions with React cache", () => {
    const src = readSrc("src", "lib", "billing", "subscription-lookup.ts");
    expect(src).toContain('from "react"');
    expect(src).toContain("cache(");
    expect(src).toContain("loadUserSubscriptionsCached");
  });
});
