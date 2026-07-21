import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  conversationHistoryPeriod,
  filterHistoryItems,
  groupConversationsByPeriod,
  HISTORY_LIST_DEFAULT_LIMIT,
  HISTORY_LIST_EXPANDED_LIMIT,
  HISTORY_PREVIEW_FETCH_CAP,
  resolveHistoryListLimit,
} from "@/lib/conversations/history-list";

const root = process.cwd();

describe("conversation history list helpers", () => {
  const now = new Date("2026-07-21T15:00:00.000Z");

  it("resolves default and expanded limits with hard cap", () => {
    expect(resolveHistoryListLimit(undefined)).toEqual({
      limit: HISTORY_LIST_DEFAULT_LIMIT,
      expanded: false,
    });
    expect(resolveHistoryListLimit("1")).toEqual({
      limit: HISTORY_LIST_EXPANDED_LIMIT,
      expanded: true,
    });
    expect(HISTORY_LIST_EXPANDED_LIMIT).toBeLessThanOrEqual(60);
    expect(HISTORY_PREVIEW_FETCH_CAP).toBeLessThanOrEqual(10);
  });

  it("classifies periods without inventing spiritual meaning", () => {
    expect(
      conversationHistoryPeriod(new Date("2026-07-21T10:00:00.000Z").toISOString(), now),
    ).toBe("today");
    expect(
      conversationHistoryPeriod(new Date("2026-07-20T10:00:00.000Z").toISOString(), now),
    ).toBe("yesterday");
    expect(
      conversationHistoryPeriod(new Date("2026-07-18T10:00:00.000Z").toISOString(), now),
    ).toBe("week");
    expect(
      conversationHistoryPeriod(new Date("2026-06-01T10:00:00.000Z").toISOString(), now),
    ).toBe("older");
  });

  it("groups and filters locally", () => {
    const items = [
      {
        id: "1",
        title: "Decisão profissional",
        updatedAt: new Date("2026-07-21T12:00:00.000Z").toISOString(),
        preview: "Preciso de clareza",
      },
      {
        id: "2",
        title: "Ansiedade",
        updatedAt: new Date("2026-06-01T12:00:00.000Z").toISOString(),
        preview: null,
      },
    ];
    const groups = groupConversationsByPeriod(items, now);
    expect(groups.map((g) => g.key)).toEqual(["today", "older"]);
    expect(filterHistoryItems(items, "clareza")).toHaveLength(1);
    expect(filterHistoryItems(items, "xyz")).toHaveLength(0);
  });
});

describe("conversas retention contracts", () => {
  it("page wires search, period groups, load more and journey empty CTA", () => {
    const page = readFileSync(
      join(root, "src", "app", "(platform)", "conversas", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("ConversationHistoryList");
    expect(page).toContain("resolveHistoryListLimit");
    expect(page).toContain("canUseReadingJourneys");
    expect(page).toContain("Ver Jornadas");
    expect(page).toContain("findLatestUserMessage");
    expect(page).toContain("HISTORY_PREVIEW_FETCH_CAP");
    expect(page).not.toContain("listRecent");
    expect(page).not.toMatch(/favorit/i);
  });

  it("client list differentiates continue vs new reflection", () => {
    const client = readFileSync(
      join(
        root,
        "src",
        "components",
        "conversations",
        "conversation-history-list.tsx",
      ),
      "utf8",
    );
    expect(client).toContain("Retomar conversa");
    expect(client).toContain("Nova reflexão");
    expect(client).toContain("Buscar no histórico carregado");
    expect(client).toContain("Carregar mais conversas");
    expect(client).toContain("groupConversationsByPeriod");
  });
});
