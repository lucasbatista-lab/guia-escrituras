import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}
function exists(...parts: string[]) {
  return existsSync(join(root, ...parts));
}

describe("performance — request memoization and boundaries", () => {
  it("memoizes auth and journey resolve with React.cache", () => {
    const session = read("src", "lib", "auth", "session.ts");
    expect(session).toContain('from "react"');
    expect(session).toMatch(/export const getAuthUserContext = cache\(/);

    const journey = read(
      "src",
      "lib",
      "journey",
      "resolve-user-journey-state.ts",
    );
    expect(journey).toContain('from "react"');
    expect(journey).toMatch(/export const resolveUserJourneyState = cache\(/);
  });

  it("platform pages share resolveUserJourneyState() args with layout", () => {
    for (const rel of [
      ["src", "app", "(platform)", "layout.tsx"],
      ["src", "app", "(platform)", "inicio", "page.tsx"],
      ["src", "app", "(platform)", "conversar", "page.tsx"],
      ["src", "app", "(platform)", "conversas", "page.tsx"],
      ["src", "app", "(platform)", "jornadas", "page.tsx"],
    ]) {
      const src = read(...rel);
      expect(src).toContain("resolveUserJourneyState()");
      expect(src).not.toMatch(
        /resolveUserJourneyState\(\{\s*userId:\s*auth\.userId\s*\}\)/,
      );
    }
  });

  it("adds auth/platform/admin error and auth loading boundaries", () => {
    expect(exists("src", "app", "(auth)", "loading.tsx")).toBe(true);
    expect(exists("src", "app", "(auth)", "error.tsx")).toBe(true);
    expect(exists("src", "app", "(platform)", "error.tsx")).toBe(true);
    expect(exists("src", "app", "admin", "error.tsx")).toBe(true);
    expect(read("src", "app", "(platform)", "error.tsx")).toContain("reset");
    expect(read("src", "app", "admin", "error.tsx")).toContain("reset");
  });

  it("admin custos uses slim AI cost metrics, not full overview", () => {
    const page = read("src", "app", "admin", "custos", "page.tsx");
    expect(page).toContain("getAdminAiCostMetrics");
    expect(page).not.toContain("getAdminOverviewMetrics");
    expect(page).not.toContain("formatRevenueBrl");
    const metrics = read("src", "lib", "admin", "metrics.ts");
    expect(metrics).toContain("export async function getAdminAiCostMetrics");
    expect(metrics).toContain("aggregateUsageEventsPaginated");
  });
});
