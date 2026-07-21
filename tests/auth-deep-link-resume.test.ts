import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildConversarResumePath,
  buildJourneyResumePath,
  buildLoginHref,
  safeNextPath,
} from "@/lib/navigation/safe-next-path";

const root = process.cwd();

function readSrc(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8");
}

describe("auth deep-link resume (sprint 4)", () => {
  it("preserves allowlisted conversar query params for login next", () => {
    const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const path = buildConversarResumePath({
      c: uuid,
      tema: "Ansiedade e decisões",
      jornada: "ansiedade-e-paz",
      etapa: "passo-1",
      evil: ["<script>"],
    });
    expect(path).toContain(`c=${uuid}`);
    expect(path).toContain("tema=");
    expect(path).toContain("jornada=ansiedade-e-paz");
    expect(path).toContain("etapa=passo-1");
    expect(path).not.toContain("evil");
    expect(path).not.toContain("<script>");
  });

  it("drops invalid conversation ids and hostile journey segments", () => {
    expect(
      buildConversarResumePath({
        c: "not-a-uuid",
        jornada: "../etc/passwd",
        etapa: "passo-1",
      }),
    ).toBe("/conversar");

    expect(
      buildConversarResumePath({
        c: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "other"],
        tema: ["  ok  ", "ignored"],
      }),
    ).toBe(
      "/conversar?c=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&tema=ok",
    );
  });

  it("strips HTML from tema and bounds length", () => {
    const path = buildConversarResumePath({
      tema: '<img src=x onerror=alert(1)>paz',
    });
    expect(path).toContain("tema=");
    expect(path.toLowerCase()).not.toContain("<img");
    expect(path).not.toContain("onerror");
  });

  it("builds journey resume paths and rejects hostile slugs", () => {
    expect(buildJourneyResumePath("ansiedade-e-paz", "passo-1")).toBe(
      "/jornadas/ansiedade-e-paz/passo-1",
    );
    expect(buildJourneyResumePath("ansiedade-e-paz")).toBe(
      "/jornadas/ansiedade-e-paz",
    );
    expect(buildJourneyResumePath("javascript:alert(1)", "x")).toBe(
      "/jornadas",
    );
    expect(buildJourneyResumePath("ok", "evil/../x")).toBe("/jornadas/ok");
  });

  it("encodes nested query strings in login href", () => {
    const href = buildLoginHref(
      "/conversar?c=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&tema=paz",
      "/conversar",
    );
    expect(href.startsWith("/entrar?next=")).toBe(true);
    const next = decodeURIComponent(href.slice("/entrar?next=".length));
    expect(next).toBe(
      "/conversar?c=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&tema=paz",
    );
    expect(safeNextPath(next, "/inicio")).toBe(next);
  });

  it("rejects open redirects when building login href", () => {
    expect(buildLoginHref("//evil.test", "/inicio")).toBe(
      `/entrar?next=${encodeURIComponent("/inicio")}`,
    );
    expect(buildLoginHref("https://evil.test/x", "/inicio")).toBe(
      `/entrar?next=${encodeURIComponent("/inicio")}`,
    );
  });

  it("allows biblical colon in query while still blocking scheme smuggling", () => {
    expect(safeNextPath("/conversar?tema=Joao+3:16", "/inicio")).toBe(
      "/conversar?tema=Joao+3:16",
    );
    expect(
      safeNextPath("/inicio?x=javascript:alert(1)", "/inicio"),
    ).toBe("/inicio");
    expect(safeNextPath("/javascript:alert(1)", "/inicio")).toBe("/inicio");
  });

  it("platform pages preserve deep links via helpers", () => {
    const conversar = readSrc("src", "app", "(platform)", "conversar", "page.tsx");
    expect(conversar).toContain("buildConversarResumePath");
    expect(conversar).toContain("buildLoginHref");
    expect(conversar).not.toContain('redirect("/entrar?next=/conversar")');

    const step = readSrc(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "[step]",
      "page.tsx",
    );
    expect(step).toContain("buildJourneyResumePath");
    expect(step).toContain("buildLoginHref");
    expect(step).not.toContain('redirect("/entrar?next=/jornadas")');

    const detail = readSrc(
      "src",
      "app",
      "(platform)",
      "jornadas",
      "[slug]",
      "page.tsx",
    );
    expect(detail).toContain("buildJourneyResumePath");
    expect(detail).toContain("buildLoginHref");
  });
});
