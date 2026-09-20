import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PASTORAL_QUALITY_FIXTURES,
  scorePastoralQualityFixture,
} from "@/lib/evals/pastoral-quality/fixtures";
import {
  countQuestions,
  detectPastoralCliches,
  looksGenericChristianChatgpt,
} from "@/lib/ai/pastoral-voice";
import { buildDailyChatPrefill } from "@/lib/daily";
import { theologyPolicyResolver } from "@/lib/theology";
import { PASTORAL_RUBRIC_KEYS } from "@/lib/evals/pastoral-live/score";

function readSrc(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("pastoral quality offline scorecard", () => {
  it("covers the required pastoral themes", () => {
    const themes = PASTORAL_QUALITY_FIXTURES.map((f) => f.theme);
    for (const needed of [
      "ansiedade",
      "culpa",
      "luto",
      "perdão",
      "relacionamento",
      "solidão",
      "propósito",
      "trabalho",
      "fé enfraquecida",
      "oração",
      "dúvida bíblica",
      "interpretação de passagem",
      "usuário querendo conversar",
      "usuário retornando após dias",
      "assunto repetido",
      "raiva",
      "tentação",
      "católico",
      "evangélico/protestante",
      "não denominacional",
      "autoagressão",
    ]) {
      expect(themes).toContain(needed);
    }
  });

  it("passes pastoral fixtures and fails cliché/crisis fakes", () => {
    for (const fixture of PASTORAL_QUALITY_FIXTURES) {
      const scored = scorePastoralQualityFixture(fixture);
      if (fixture.expectPass) {
        expect(scored.hardFailReasons, fixture.id).toEqual([]);
        expect(scored.scores.ausencia_cliches, fixture.id).toBeGreaterThan(0);
        expect(scored.scores.pergunta_continuidade, fixture.id).toBeGreaterThan(0);
      } else if (fixture.id === "crisis-bad") {
        expect(scored.passed, fixture.id).toBe(false);
      } else {
        expect(scored.scores.ausencia_cliches, fixture.id).toBe(0);
        expect(scored.scores.pergunta_continuidade, fixture.id).toBe(0);
        expect(looksGenericChristianChatgpt(fixture.answer)).toBe(true);
      }
    }
  });

  it("detects generic christian ChatGPT voice and stacked questions", () => {
    const bad =
      "Como uma inteligência artificial, é importante ressaltar que Deus tem um plano. Qual seu nome? O que sente? Já orou?";
    expect(looksGenericChristianChatgpt(bad)).toBe(true);
    expect(detectPastoralCliches(bad).length).toBeGreaterThan(0);
    expect(countQuestions(bad)).toBeGreaterThan(2);
  });
});

describe("chat quality prompt and daily link", () => {
  it("composes pastoral voice without weakening identity rules", () => {
    const policy = theologyPolicyResolver.resolve({
      traditionKey: "evangelical",
      personaKey: "jesus",
      userPrefs: {
        responseStyle: "pastoral",
        preferredDepth: "balanced",
        saintsContentEnabled: false,
        preferredBibleTranslation: null,
        denomination: null,
      },
    });
    expect(policy.composedSystemPromptSections.join("\n")).toContain(
      "Qualidade da conversa",
    );
    expect(policy.composedSystemPromptSections.join("\n")).toContain(
      "Não faça mais de uma pergunta por turno",
    );
    expect(policy.composedSystemPromptSections.join("\n")).toContain(
      "Bíblia entra com naturalidade",
    );
    expect(policy.composedSystemPromptSections.join("\n")).toContain(
      "não é Deus, Jesus, pastor ordenado nem terapeuta",
    );
    expect(policy.generalRules.some((r) => r.includes("Não afirme ser Jesus"))).toBe(
      true,
    );
    expect(PASTORAL_RUBRIC_KEYS).toContain("ausencia_cliches");
    expect(PASTORAL_RUBRIC_KEYS).toContain("naturalidade");
  });

  it("daily prefill is registry-only and chat schema accepts dailyDate", () => {
    const prefill = buildDailyChatPrefill("2026-09-20");
    expect(prefill).toContain("Josué 1:9");
    const schema = readSrc("src", "lib", "ai", "chat-schema.ts");
    expect(schema).toContain("dailyDate");
    const service = readSrc("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain("trustedEditorialContext");
    expect(service).toContain("chat_started");
    expect(service).toContain("first_chat_completed");
    expect(service).toContain('event: "chat_started"');
    expect(service).toContain('event: "first_chat_completed"');
    expect(service).not.toContain("event: body.message");
  });

  it("does not log user message content in product events", () => {
    const persist = readSrc("src", "lib", "product-events", "persist.ts");
    expect(persist).not.toContain("message:");
    expect(persist).toContain("event_name");
  });
});
