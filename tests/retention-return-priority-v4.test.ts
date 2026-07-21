import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  pickMostRecentInProgressJourney,
  pickPrimaryReturnTarget,
  type ReturnTargetCandidate,
} from "@/lib/conversations/return-priority";

const chat = (
  updatedAt: string,
  overrides: Partial<ReturnTargetCandidate> = {},
): ReturnTargetCandidate => ({
  kind: "chat",
  updatedAt,
  title: "Conversa sobre ansiedade",
  subtitle: "Estou cansado…",
  href: "/conversar?c=c1",
  cta: "Retomar conversa",
  ...overrides,
});

const journey = (
  updatedAt: string,
  overrides: Partial<ReturnTargetCandidate> = {},
): ReturnTargetCandidate => ({
  kind: "journey",
  updatedAt,
  title: "Ansiedade e confiança",
  subtitle: "Etapa 3 · Descanso",
  href: "/jornadas/ansiedade-confianca/descanso",
  cta: "Continuar jornada",
  ...overrides,
});

describe("pickPrimaryReturnTarget", () => {
  it("returns null when there are no valid candidates", () => {
    expect(pickPrimaryReturnTarget([])).toBeNull();
    expect(
      pickPrimaryReturnTarget([
        chat("not-a-date"),
        journey("", { href: "" }),
      ]),
    ).toBeNull();
  });

  it("picks chat alone as primary without secondary", () => {
    const sel = pickPrimaryReturnTarget([chat("2026-07-21T12:00:00.000Z")]);
    expect(sel?.primary.kind).toBe("chat");
    expect(sel?.secondary).toBeNull();
  });

  it("picks journey alone as primary without secondary", () => {
    const sel = pickPrimaryReturnTarget([
      journey("2026-07-20T10:00:00.000Z"),
    ]);
    expect(sel?.primary.kind).toBe("journey");
    expect(sel?.secondary).toBeNull();
  });

  it("prioritizes the more recent activity between chat and journey", () => {
    const olderChat = chat("2026-07-18T12:00:00.000Z");
    const newerJourney = journey("2026-07-21T08:00:00.000Z");
    const sel = pickPrimaryReturnTarget([olderChat, newerJourney]);
    expect(sel?.primary.kind).toBe("journey");
    expect(sel?.primary.href).toBe(newerJourney.href);
    expect(sel?.secondary?.kind).toBe("chat");
    expect(sel?.secondary?.href).toBe(olderChat.href);
  });

  it("does not invent a second secondary of the same kind", () => {
    const sel = pickPrimaryReturnTarget([
      chat("2026-07-21T15:00:00.000Z"),
      chat("2026-07-20T15:00:00.000Z", {
        href: "/conversar?c=c2",
        title: "Outra",
      }),
    ]);
    expect(sel?.primary.href).toContain("c1");
    expect(sel?.secondary).toBeNull();
  });
});

describe("pickMostRecentInProgressJourney", () => {
  it("ignores completed and not-started rows", () => {
    expect(
      pickMostRecentInProgressJourney([
        {
          updatedAt: "2026-07-21T10:00:00.000Z",
          isStarted: false,
          isCompleted: false,
        },
        {
          updatedAt: "2026-07-21T11:00:00.000Z",
          isStarted: true,
          isCompleted: true,
        },
      ]),
    ).toBeNull();
  });

  it("returns the newest in-progress journey by updatedAt", () => {
    const older = {
      slug: "a",
      updatedAt: "2026-07-10T10:00:00.000Z",
      isStarted: true,
      isCompleted: false,
    };
    const newer = {
      slug: "b",
      updatedAt: "2026-07-20T10:00:00.000Z",
      isStarted: true,
      isCompleted: false,
    };
    expect(pickMostRecentInProgressJourney([older, newer])).toEqual(newer);
  });
});

describe("retention V4 wiring", () => {
  it("inicio uses return priority and keeps theme shortcuts off the resume path", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/(platform)/inicio/page.tsx"),
      "utf8",
    );
    expect(page).toContain("pickPrimaryReturnTarget");
    expect(page).toContain("returnSelection");
    expect(page).toContain("primary.cta");
    expect(page).toContain("Última atividade");
    // Theme shortcuts stay on the empty/first-reflection branch only.
    const afterResumeHeading = page.slice(page.indexOf('id="resume-heading"'));
    expect(afterResumeHeading).not.toContain("ThemeShortcutsSection");
    expect(page).toContain("ThemeShortcutsSection");
  });

  it("journeys inicio card picks most recent in-progress journey", () => {
    const card = readFileSync(
      join(
        process.cwd(),
        "src/components/journeys/journeys-inicio-card.tsx",
      ),
      "utf8",
    );
    expect(card).toContain("pickMostRecentInProgressJourney");
  });
});
