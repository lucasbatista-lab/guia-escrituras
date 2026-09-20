import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addCalendarDays,
  brtCalendarDate,
  buildDailyChatPrefill,
  buildDailyShareText,
  calendarDayIndex,
  DAILY_CHECKIN_VALUES,
  DAILY_CONTENT_SEED,
  getDailyContentForDate,
  isDailyCheckinValue,
  isIsoCalendarDate,
  journeyCanAccessDaily,
  journeyCanPersonalize,
  listRecentCalendarDates,
  PRODUCT_TIMEZONE,
  publicDailyShareFields,
} from "@/lib/daily";
import {
  getRequiredDestinationForState,
  journeyAllowsChat,
  type UserJourneyState,
} from "@/lib/journey/journey-state";
import {
  PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS,
  PRODUCT_EVENT_NAMES,
  sanitizeProductEventPath,
} from "@/lib/product-events/types";

const root = process.cwd();

function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("free user architecture", () => {
  it("sends confirmed_without_plan and ended to /inicio", () => {
    expect(getRequiredDestinationForState("confirmed_without_plan")).toBe(
      "/inicio",
    );
    expect(getRequiredDestinationForState("ended")).toBe("/inicio");
    expect(getRequiredDestinationForState("payment_pending")).toBe(
      "/assinar/continuar",
    );
    expect(getRequiredDestinationForState("active_ready")).toBe("/inicio");
  });

  it("does not grant chat or journeys to free states", () => {
    for (const state of [
      "confirmed_without_plan",
      "ended",
      "past_due",
      "payment_pending",
    ] as UserJourneyState[]) {
      expect(journeyAllowsChat(state)).toBe(false);
      expect(journeyCanAccessDaily(state)).toBe(true);
    }
    expect(journeyCanPersonalize("confirmed_without_plan")).toBe(true);
    expect(journeyCanPersonalize("payment_pending")).toBe(false);
  });

  it("signup without plan does not create checkout intent", () => {
    const action = readSrc("src", "lib", "auth", "sign-up-action.ts");
    expect(action).toContain("const hasPlan = Boolean(parsed.data.planKey?.trim())");
    expect(action).toContain('getEmailRedirectTo("/email-confirmado")');
    expect(action).toContain("createSignupIntentWithToken");
  });

  it("chat API still requires a live plan before persist", () => {
    const service = readSrc("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain("subscription_required");
    expect(service).toContain("if (!auth.planKey)");
    expect(service).toContain(
      "Conversar é um recurso dos planos pagos",
    );
  });

  it("journeys remain Caminho+ server-side", () => {
    const auth = readSrc("src", "lib", "journeys", "api-auth.ts");
    expect(auth).toContain("canUseReadingJourneys(auth.planKey)");
    expect(auth).toContain("journeys_not_entitled");
  });
});

describe("daily content BRT", () => {
  it("uses America/Sao_Paulo as the only timezone", () => {
    expect(PRODUCT_TIMEZONE).toBe("America/Sao_Paulo");
  });

  it("turns over at midnight BRT", () => {
    // 2026-09-21 02:59 UTC = 2026-09-20 23:59 BRT (UTC-3, no DST)
    expect(brtCalendarDate(new Date("2026-09-21T02:59:59.000Z"))).toBe(
      "2026-09-20",
    );
    expect(brtCalendarDate(new Date("2026-09-21T03:00:00.000Z"))).toBe(
      "2026-09-21",
    );
  });

  it("serves exact publish dates and cycles otherwise", () => {
    const pinned = getDailyContentForDate("2026-09-20");
    expect(pinned.id).toBe("qa-07-coragem");
    expect(pinned.scriptureReference).toBe("Josué 1:9");

    const cycled = getDailyContentForDate("2026-10-01");
    expect(cycled.status).toBe("published");
    expect(cycled.scriptureBook.length).toBeGreaterThan(0);
    const idx = calendarDayIndex("2026-10-01") % DAILY_CONTENT_SEED.length;
    expect(cycled.id).toBe(DAILY_CONTENT_SEED[idx]!.id);
  });

  it("keeps a small QA seed with bible-ready fields and no licensed corpus", () => {
    expect(DAILY_CONTENT_SEED.length).toBeGreaterThanOrEqual(3);
    expect(DAILY_CONTENT_SEED.length).toBeLessThanOrEqual(7);
    for (const item of DAILY_CONTENT_SEED) {
      expect(item.scriptureChapter).toBeGreaterThan(0);
      expect(item.scriptureStartVerse).toBeGreaterThan(0);
      expect(item.translationId).toBeNull();
      expect(item.scriptureText).toBeNull();
      expect(item.paraphrase.toLowerCase()).not.toMatch(/\bnvi\b/);
    }
    const seed = readSrc("src", "lib", "daily", "content.ts");
    expect(seed.toLowerCase()).not.toContain("nova versão internacional");
  });

  it("validates calendar dates and 7-day history", () => {
    expect(isIsoCalendarDate("2026-09-20")).toBe(true);
    expect(isIsoCalendarDate("2026-13-01")).toBe(false);
    expect(addCalendarDays("2026-09-20", -1)).toBe("2026-09-19");
    expect(listRecentCalendarDates("2026-09-20", 7)).toHaveLength(7);
  });
});

describe("daily check-in, save and share privacy", () => {
  it("accepts only the closed check-in enum", () => {
    expect(DAILY_CHECKIN_VALUES).toEqual([
      "grateful",
      "peaceful",
      "anxious",
      "tired",
      "lost",
      "hopeful",
    ]);
    expect(isDailyCheckinValue("grateful")).toBe(true);
    expect(isDailyCheckinValue("angry")).toBe(false);
  });

  it("share payload never includes check-in or account data", () => {
    const content = getDailyContentForDate("2026-09-20");
    const fields = publicDailyShareFields(content);
    expect(fields).toEqual({
      reference: content.scriptureReference,
      paraphrase: content.paraphrase,
      prayer: content.prayer,
      action: content.action,
      brand: "Amém Chat",
    });
    const text = buildDailyShareText({
      content,
      shareUrl: "https://amemchat.com.br/hoje/2026-09-20",
    });
    expect(text).toContain(content.scriptureReference);
    expect(text.toLowerCase()).not.toContain("check-in");
    expect(text).not.toContain("grateful");
    expect(text).not.toContain("@");
  });

  it("chat prefill is editorial-only", () => {
    const prefill = buildDailyChatPrefill("2026-09-20");
    expect(prefill).toContain("Josué 1:9");
    expect(prefill).not.toMatch(/grateful|anxious|tired/);
    expect(buildDailyChatPrefill("not-a-date")).toBeUndefined();
  });
});

describe("product analytics privacy", () => {
  it("allows the required events and no private payload keys", () => {
    for (const name of [
      "free_account_created",
      "daily_opened",
      "daily_content_viewed",
      "daily_completed",
      "daily_saved",
      "daily_shared",
      "checkin_completed",
      "premium_prompt_viewed",
      "premium_prompt_clicked",
    ]) {
      expect(PRODUCT_EVENT_NAMES).toContain(name);
    }
    expect(PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS).toEqual(
      expect.arrayContaining(["checkin", "prayer", "journal", "message"]),
    );
    expect(sanitizeProductEventPath("/inicio")).toBe("/inicio");
    expect(sanitizeProductEventPath("/conversar?secret=1")).toBeNull();
  });

  it("persist layer does not accept emotion or prayer text", () => {
    const persist = readSrc("src", "lib", "product-events", "persist.ts");
    expect(persist).not.toContain("checkin");
    expect(persist).not.toContain("prayer");
    expect(persist).toContain("maskUserId");
    const interactionApi = readSrc(
      "src",
      "app",
      "api",
      "daily",
      "interaction",
      "route.ts",
    );
    expect(interactionApi).toContain("checkin_completed");
    expect(interactionApi).not.toMatch(
      /persistProductEvent\([\s\S]*checkin:/,
    );
  });
});

describe("daily has zero LLM runtime", () => {
  it("daily modules do not import openai or chat-service", () => {
    const files = [
      ["src", "lib", "daily", "content.ts"],
      ["src", "lib", "daily", "interactions.ts"],
      ["src", "lib", "daily", "share.ts"],
      ["src", "app", "api", "daily", "route.ts"],
      ["src", "components", "daily", "hoje-com-deus-card.tsx"],
    ];
    for (const parts of files) {
      const src = readSrc(...parts);
      expect(src).not.toMatch(/openai|chat-service|createAiProvider/);
    }
  });
});

describe("daily RLS migration", () => {
  it("is additive with own-row policies and check-in constraint", () => {
    const sql = readSrc(
      "supabase",
      "migrations",
      "20260920000014_user_daily_interactions_and_product_events.sql",
    );
    expect(sql).toContain("create table public.user_daily_interactions");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("user_daily_interactions_select_own");
    expect(sql).toContain("product_events_insert_own");
    expect(sql).toContain("'grateful'");
    expect(sql).not.toMatch(/^\s*drop table/im);
    expect(sql).toContain("revoke all on table public.user_daily_interactions from anon");
  });
});
