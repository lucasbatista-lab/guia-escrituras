import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJourneyStepChatPrefill } from "@/lib/journeys/chat-prefill";
import { getAllJourneys } from "@/lib/journeys/registry";
import { FIXTURE_JOURNEY_SLUG } from "./fixtures/synthetic-users";

const root = process.cwd();
function readSrc(...parts: string[]) {
  return readFileSync(join(root, "src", ...parts), "utf8");
}

describe("real-usage: journey prefill without auto-send", () => {
  it("builds editable draft from allow-listed registry only", () => {
    const journey = getAllJourneys().find((j) => j.slug === FIXTURE_JOURNEY_SLUG)!;
    const step = journey.steps[0]!;
    const draft = buildJourneyStepChatPrefill(journey.slug, step.slug);
    expect(draft).toBeTruthy();
    expect(draft).toContain(step.title);
    expect(buildJourneyStepChatPrefill("evil-slug", "x")).toBeUndefined();
    expect(
      buildJourneyStepChatPrefill(journey.slug, "<script>alert(1)</script>"),
    ).toBeUndefined();
  });

  it("conversar page passes initialDraft and never POSTs chat on render", () => {
    const page = readSrc("app", "(platform)", "conversar", "page.tsx");
    expect(page).toContain("buildJourneyStepChatPrefill");
    expect(page).toContain("initialDraft");
    expect(page).toContain("journey_chat_prefill_opened");
    expect(page).not.toMatch(/fetch\(["']\/api\/chat/);
    expect(page).not.toMatch(/runChatTurn/);
  });

  it("ChatPanel only sends on explicit send() — no mount auto-submit", () => {
    const panel = readSrc("components", "chat", "chat-panel.tsx");
    expect(panel).toContain("initialDraft");
    expect(panel).toContain("resolveInitialComposerInput");
    expect(panel).toMatch(/urlDraft:\s*initialDraft/);
    // useEffects are for reduced-motion, draft persist, and scroll — not send
    expect(panel).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*send\(/s);
    expect(panel).toMatch(/async function send\(/);
  });
});
