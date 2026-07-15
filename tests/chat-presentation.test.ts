import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasRenderableFollowUpQuestion,
  hasRenderableInterpretationNotice,
  normalizeAssistantPresentation,
} from "@/lib/ai/normalize-assistant-presentation";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";

function read(...parts: string[]) {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("chat presentation — empty and literal structured fields", () => {
  it("treats empty / whitespace / label-only notice as not renderable", () => {
    expect(hasRenderableInterpretationNotice("")).toBe(false);
    expect(hasRenderableInterpretationNotice("   ")).toBe(false);
    expect(hasRenderableInterpretationNotice("interpretationNotice:")).toBe(
      false,
    );
    expect(hasRenderableInterpretationNotice("Interpretation notice:")).toBe(
      false,
    );
    expect(
      hasRenderableInterpretationNotice(SHORT_INTERPRETATION_NOTICE),
    ).toBe(true);
  });

  it("normalizes empty notice to blank (UI must omit)", () => {
    const normalized = normalizeAssistantPresentation({
      answer: "Reflexão legítima sobre perdão familiar.",
      interpretationNotice: "   ",
      followUpQuestion: "",
      biblicalReferences: [{ book: "Colossenses", chapter: 3, verseStart: 13 }],
    });
    expect(normalized.answer).toContain("perdão familiar");
    expect(normalized.interpretationNotice).toBe("");
    expect(normalized.followUpQuestion).toBeUndefined();
  });

  it("keeps a filled notice once and strips it from the body", () => {
    const notice = SHORT_INTERPRETATION_NOTICE;
    const normalized = normalizeAssistantPresentation({
      answer: `Corpo da reflexão.\n\n${notice}`,
      interpretationNotice: notice,
      followUpQuestion: "Quer continuar?",
      biblicalReferences: [{ book: "Filipenses", chapter: 4, verseStart: 6 }],
    });
    expect(normalized.interpretationNotice).toBe(notice);
    expect(normalized.answer).toContain("Corpo da reflexão");
    expect(normalized.answer).not.toContain(notice);
    expect(normalized.followUpQuestion).toBe("Quer continuar?");
  });

  it("strips literal field labels from the answer body", () => {
    const normalized = normalizeAssistantPresentation({
      answer: [
        "Texto pastoral válido.",
        "interpretationNotice:",
        "",
        "Interpretation notice:",
        "followUpQuestion:",
        "conversationMemory:",
        "references:",
      ].join("\n"),
      interpretationNotice: "interpretationNotice:",
      followUpQuestion: "followUpQuestion:",
      biblicalReferences: [],
    });
    expect(normalized.answer).toContain("Texto pastoral válido");
    expect(normalized.answer.toLowerCase()).not.toContain("interpretationnotice");
    expect(normalized.answer.toLowerCase()).not.toContain("followupquestion");
    expect(normalized.answer.toLowerCase()).not.toContain("conversationmemory");
    expect(normalized.interpretationNotice).toBe("");
    expect(normalized.followUpQuestion).toBeUndefined();
  });

  it("omits empty follow-up and keeps unique references list for UI", () => {
    expect(hasRenderableFollowUpQuestion(null)).toBe(false);
    expect(hasRenderableFollowUpQuestion("")).toBe(false);
    const refs = [
      { book: "Salmos", chapter: 23, verseStart: 1 },
      { book: "João", chapter: 14, verseStart: 27 },
    ];
    const normalized = normalizeAssistantPresentation({
      answer: "Reflexão.\n\nReferências · Salmos 23:1 · João 14:27",
      interpretationNotice: SHORT_INTERPRETATION_NOTICE,
      followUpQuestion: "   ",
      biblicalReferences: refs,
    });
    expect(normalized.followUpQuestion).toBeUndefined();
    expect(normalized.answer).not.toContain("Referências ·");
    expect(normalized.interpretationNotice).toBe(SHORT_INTERPRETATION_NOTICE);
  });

  it("chat panel only renders notice when content is present", () => {
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).toContain("hasRenderableInterpretationNotice");
    expect(panel).toContain("hasRenderableFollowUpQuestion");
    expect(panel).toContain("AssistantMetaFooter");
    expect(panel).not.toMatch(
      /<p className="text-xs leading-relaxed">\s*\{message\.meta\.interpretationNotice\}/,
    );
  });

  it("does not expose internal field names or persist warnings in public paths", () => {
    const service = read("src", "lib", "ai", "chat-service.ts");
    expect(service).toContain("normalizeAssistantPresentation");
    expect(service).toContain("presented.interpretationNotice");
    // Technical persist warnings stay in logs, not in returned notice
    expect(service).not.toMatch(
      /interpretationNotice:\s*persistWarning\s*\?/,
    );
    const panel = read("src", "components", "chat", "chat-panel.tsx");
    expect(panel).not.toContain("conversationMemory");
    expect(panel).not.toContain("Request ID");
    expect(panel).not.toMatch(/>\s*requestId\s*</);
  });
});
