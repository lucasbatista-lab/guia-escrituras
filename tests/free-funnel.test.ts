import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  aggregateProductEventFunnel,
  deriveD1Return,
} from "@/lib/admin/free-funnel";
import { PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS } from "@/lib/product-events/types";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("free funnel aggregation", () => {
  it("counts allowlisted events without storing private keys", () => {
    const rows = [
      {
        event_name: "free_account_created",
        user_id: "u1",
        created_at: "2026-09-20T12:00:00.000Z",
      },
      {
        event_name: "daily_opened",
        user_id: "u1",
        created_at: "2026-09-20T12:01:00.000Z",
      },
      {
        event_name: "ignored_event",
        user_id: "u2",
        created_at: "2026-09-20T12:02:00.000Z",
      },
    ];
    const counts = aggregateProductEventFunnel(rows, "2026-09-20T00:00:00.000Z");
    expect(counts.free_account_created).toBe(1);
    expect(counts.daily_opened).toBe(1);
    expect(counts.uniqueUsers).toBe(1);
    expect(PRODUCT_EVENT_FORBIDDEN_PAYLOAD_KEYS).toEqual(
      expect.arrayContaining(["prayer", "journal", "checkin"]),
    );
  });

  it("derives D1 from activity timestamps and ignores rows with only other flags", () => {
    const d1 = deriveD1Return(
      [
        {
          user_id: "a",
          local_date: "2026-09-19",
          viewed_at: "x",
          completed_at: null,
          saved_at: null,
        },
        {
          user_id: "a",
          local_date: "2026-09-20",
          viewed_at: null,
          completed_at: "y",
          saved_at: null,
        },
        {
          user_id: "b",
          local_date: "2026-09-19",
          viewed_at: "x",
          completed_at: null,
          saved_at: null,
        },
      ],
      "2026-09-19",
    );
    expect(d1.activeOnCohort).toBe(2);
    expect(d1.returnedNextDay).toBe(1);
    expect(d1.ratePct).toBe(50);
  });

  it("admin and persist layers do not select private text", () => {
    const funnel = read("src", "lib", "admin", "free-funnel.ts");
    expect(funnel).toContain("event_name, user_id, created_at");
    expect(funnel).toContain("viewed_at, completed_at, saved_at");
    expect(funnel).not.toContain("checkin");
    expect(funnel).not.toContain("body");
    const persist = read("src", "lib", "product-events", "persist.ts");
    expect(persist).not.toContain("input.body");
    const prayers = read("src", "lib", "workspace", "prayers.ts");
    expect(prayers).not.toMatch(/openai|chat-service/);
  });
});
