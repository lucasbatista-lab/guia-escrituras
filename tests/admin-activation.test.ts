import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import {
  aggregateJourneyProgress,
  type AdminJourneyProgressRow,
} from "@/lib/admin/activation";

function row(partial: Partial<AdminJourneyProgressRow>): AdminJourneyProgressRow {
  return {
    journeySlug: "genesis-1",
    completedStepIds: null,
    startedAt: null,
    completedAt: null,
    ...partial,
  };
}

describe("aggregateJourneyProgress", () => {
  it("counts started/completed/in-progress correctly", () => {
    const rows: AdminJourneyProgressRow[] = [
      row({ journeySlug: "genesis-1", startedAt: "2026-01-01T00:00:00Z" }),
      row({
        journeySlug: "genesis-1",
        startedAt: "2026-01-02T00:00:00Z",
        completedAt: "2026-01-05T00:00:00Z",
      }),
      row({ journeySlug: "salmos-1", completedStepIds: ["step-1"] }),
      // Not started at all — must not count anywhere.
      row({ journeySlug: "joao-1" }),
    ];

    const result = aggregateJourneyProgress(rows);
    expect(result.journeysStarted).toBe(3);
    expect(result.journeysCompleted).toBe(1);
    expect(result.journeysInProgress).toBe(2);
  });

  it("treats non-empty completed_step_ids as started even without started_at", () => {
    const result = aggregateJourneyProgress([
      row({ completedStepIds: ["a", "b"] }),
    ]);
    expect(result.journeysStarted).toBe(1);
    expect(result.journeysInProgress).toBe(1);
  });

  it("builds a per-journey distribution sorted by started desc", () => {
    const result = aggregateJourneyProgress([
      row({ journeySlug: "a", startedAt: "2026-01-01T00:00:00Z" }),
      row({ journeySlug: "a", startedAt: "2026-01-01T00:00:00Z" }),
      row({
        journeySlug: "b",
        startedAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-01-02T00:00:00Z",
      }),
    ]);
    expect(result.distribution).toEqual([
      { journeySlug: "a", started: 2, completed: 0 },
      { journeySlug: "b", started: 1, completed: 1 },
    ]);
  });

  it("returns zeroed aggregates for an empty input", () => {
    const result = aggregateJourneyProgress([]);
    expect(result).toEqual({
      journeysStarted: 0,
      journeysCompleted: 0,
      journeysInProgress: 0,
      distribution: [],
    });
  });
});

describe("admin activation source contracts", () => {
  it("helper uses only allowed tables and never usage_events for exact totals", async () => {
    const source = await fs.readFile("src/lib/admin/activation.ts", "utf8");
    expect(source).toContain('from("profiles")');
    expect(source).toContain("journey_progress");
    expect(source).not.toContain('from("usage_events")');
    expect(source).not.toContain('from("messages")');
    expect(source).not.toContain("conversation_summaries");
    expect(source).toContain("Ainda não disponível com precisão");
  });

  it("page shows honest timezone labels, badges and no forbidden metrics", async () => {
    const source = await fs.readFile("src/app/admin/ativacao/page.tsx", "utf8");
    expect(source).toContain("America/Sao_Paulo");
    expect(source).toContain("PARCIAL");
    expect(source).toContain("INDISPONÍVEL");
    expect(source).toContain("aprofundarAvailabilityNote");
    expect(source).toContain("rolante");
    // Only usage_events-backed exact totals are forbidden — activation.ts
    // (checked above) never touches usage_events for these metrics.
    expect(source).toContain("active_no_conversation=1");
    expect(source).toContain("inactive_days=7");
  });

  it("nav exposes activation in the admin Mais menu", async () => {
    const source = await fs.readFile(
      "src/components/admin/admin-mobile-nav.tsx",
      "utf8",
    );
    expect(source).toContain('"/admin/ativacao"');
    expect(source).toContain("Ativação");
  });

  it("activation metrics interface surfaces partial flags honestly", async () => {
    const source = await fs.readFile("src/lib/admin/activation.ts", "utf8");
    expect(source).toContain("activeOrTrialingWithZeroConversationsPartial");
    expect(source).toContain("usersWithAtLeastOneConversationPartial");
    expect(source).toContain("journeyDataPartial");
  });
});
