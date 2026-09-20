import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { monthlyMomentsCopy } from "@/lib/workspace/moments";
import {
  PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS,
  PRODUCT_EVENT_NAMES,
} from "@/lib/product-events/types";
import { PRIVATE_PLATFORM_PREFIXES } from "@/lib/edge/private-paths";
import { getPlatformNavItemsForState } from "@/lib/journey/journey-state";
import { getDailyContentForDate, publicDailyShareFields } from "@/lib/daily";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("personal workspace privacy and access", () => {
  it("gates /espaco as a private platform prefix", () => {
    expect(PRIVATE_PLATFORM_PREFIXES).toContain("/espaco");
    expect(getPlatformNavItemsForState("confirmed_without_plan").map((i) => i.href)).toContain(
      "/espaco",
    );
    expect(getPlatformNavItemsForState("active_ready").map((i) => i.href)).toContain(
      "/espaco",
    );
    expect(getPlatformNavItemsForState("payment_pending").map((i) => i.href)).not.toContain(
      "/espaco",
    );
  });

  it("home exposes living memory without turning inicio into a portal", () => {
    const inicio = read("src", "app", "(platform)", "inicio", "page.tsx");
    expect(inicio).toContain("InicioLiving");
    // Special states still use PersonalSpaceCard; living home routes memory via Espaço.
    expect(inicio).toContain("PersonalSpaceCard");
    expect(inicio).toContain("DailyHomeSection");
  });

  it("FREE and paid pages exist for prayers, saved, and journal", () => {
    expect(read("src", "app", "(platform)", "espaco", "oracoes", "page.tsx")).toContain(
      "PrayerWorkspace",
    );
    expect(read("src", "app", "(platform)", "espaco", "salvos", "page.tsx")).toContain(
      "listSavedItems",
    );
    expect(read("src", "app", "(platform)", "espaco", "diario", "page.tsx")).toContain(
      "JournalWorkspace",
    );
  });
});

describe("workspace RLS and migrations", () => {
  it("adds own-row RLS without destructive drops", () => {
    const sql = read(
      "supabase",
      "migrations",
      "20260920000015_personal_spiritual_workspace.sql",
    );
    expect(sql).toContain("create table public.user_prayers");
    expect(sql).toContain("create table public.user_saved_items");
    expect(sql).toContain("create table public.user_private_entries");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("user_prayers_select_own");
    expect(sql).toContain("user_saved_items_select_own");
    expect(sql).toContain("user_private_entries_select_own");
    expect(sql).toContain("revoke all on table public.user_prayers from anon");
    expect(sql).not.toMatch(/^\s*drop table/im);
    expect(sql).toContain("item_type in ('daily', 'journey_step', 'editorial_prayer', 'passage')");
  });

  it("queries always filter by authenticated user id", () => {
    for (const file of [
      ["src", "lib", "workspace", "prayers.ts"],
      ["src", "lib", "workspace", "saved.ts"],
      ["src", "lib", "workspace", "entries.ts"],
    ]) {
      const src = read(...file);
      expect(src).toContain('.eq("user_id", userId)');
      expect(src).not.toMatch(/openai|chat-service|createAiProvider/);
    }
  });
});

describe("workspace analytics and share stay non-sensitive", () => {
  it("records action events without private payload keys", () => {
    for (const name of [
      "prayer_created",
      "prayer_marked_answered",
      "favorite_created",
      "journal_created",
    ]) {
      expect(PRODUCT_EVENT_NAMES).toContain(name);
    }
    expect(PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS).toEqual(
      expect.arrayContaining(["prayer", "journal", "text", "checkin"]),
    );

    const prayersApi = read("src", "app", "api", "workspace", "prayers", "route.ts");
    expect(prayersApi).toContain('event: "prayer_created"');
    expect(prayersApi).toContain('event: "prayer_marked_answered"');
    expect(prayersApi).not.toMatch(/persistProductEvent\(\{[^}]*body/);

    const entriesApi = read("src", "app", "api", "workspace", "entries", "route.ts");
    expect(entriesApi).toContain('event: "journal_created"');
    expect(entriesApi).not.toMatch(/persistProductEvent\(\{[^}]*body/);

    const persist = read("src", "lib", "product-events", "persist.ts");
    expect(persist).toContain("maskUserId");
    expect(persist).not.toContain("input.body");
  });

  it("share of daily content still excludes private workspace fields", () => {
    const fields = publicDailyShareFields(getDailyContentForDate("2026-09-20"));
    expect(JSON.stringify(fields)).not.toMatch(/checkin|journal|grateful/);
    const share = read("src", "lib", "daily", "share.ts");
    expect(share).not.toContain("checkin");
    expect(share).not.toContain("user_prayers");
  });
});

describe("monthly moments", () => {
  it("describes real counts without streak or guilt", () => {
    expect(monthlyMomentsCopy(0)).toBeNull();
    expect(monthlyMomentsCopy(1)).toBe(
      "Você reservou 1 momento de reflexão neste mês.",
    );
    expect(monthlyMomentsCopy(8)).toBe(
      "Você reservou 8 momentos de reflexão neste mês.",
    );
    const moments = read("src", "lib", "workspace", "moments.ts");
    expect(moments.toLowerCase()).not.toContain("streak");
    expect(moments).not.toMatch(/você ficou/i);
  });
});

describe("journey notes reuse private entries", () => {
  it("stores optional notes without sending them to chat prefill", () => {
    const stepPage = read(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(stepPage).toContain("JourneyStepNote");
    expect(stepPage).toContain("loadJourneyStepNote");
    const prefill = read("src", "lib", "journeys", "chat-prefill.ts");
    expect(prefill).not.toContain("user_private_entries");
    expect(prefill).not.toContain("personalNote");
  });
});

describe("account export includes workspace collections", () => {
  it("adds prayers, saved items and private entries to the owner file", () => {
    const types = read("src", "lib", "account", "export-types.ts");
    expect(types).toContain("prayers: UserDataExportPrayer[]");
    expect(types).toContain("savedItems: UserDataExportSavedItem[]");
    expect(types).toContain("privateEntries: UserDataExportPrivateEntry[]");
    const builder = read("src", "lib", "account", "export-user-data.ts");
    expect(builder).toContain("loadWorkspaceForExport");
    expect(builder).toContain(".eq(\"user_id\", userId)");
  });
});
