import { MockAiProvider } from "@/lib/ai/mock-provider";
import { normalizeAssistantPresentation } from "@/lib/ai/normalize-assistant-presentation";
import { curatedBiblicalProvider } from "@/lib/biblical/curated-provider";
import { SHORT_INTERPRETATION_NOTICE } from "@/lib/theology/general-rules";
import { theologyPolicyResolver } from "@/lib/theology";
import { AppError } from "@/lib/safety";
import { evaluateTheologyResponse } from "./evaluate";
import type { TheologyEvalResult, TheologyEvalScenario } from "./schemas";

/**
 * Offline pipeline using curated grounding + MockAiProvider only.
 * Never calls OpenAI — even if OPENAI_API_KEY is present.
 */
export async function runOfflineMockPipeline(
  scenario: TheologyEvalScenario,
): Promise<TheologyEvalResult> {
  const requestId = `eval-offline-${scenario.id}`;
  const grounding = curatedBiblicalProvider.retrieve({
    question: scenario.userMessage,
    traditionKey: "ecumenical",
    personaKey: "jesus",
    allowsSaintsContent: false,
    varietySeed: requestId,
    limit: 4,
  });

  const theologyPolicy = theologyPolicyResolver.resolve({
    traditionKey: "ecumenical",
    personaKey: "jesus",
    userPrefs: {
      responseStyle: "reflective",
      preferredDepth: "balanced",
      saintsContentEnabled: false,
      preferredBibleTranslation: null,
      denomination: null,
    },
  });

  const provider = new MockAiProvider();
  const allowedReferences = grounding.allowedReferences.map((ref) => ({
    book: ref.book,
    chapter: ref.chapter,
    verseStart: ref.verseStart,
    ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
  }));

  try {
    const generated = await provider.generate({
      messages: [{ role: "user", content: scenario.userMessage }],
      currentUserMessage: scenario.userMessage,
      theologyPolicy,
      model: "mock-eval",
      conversationSummary: null,
      requestId,
      grounding,
      responseDepth: "balanced",
    });

    const normalized = normalizeAssistantPresentation({
      answer: generated.answer,
      interpretationNotice: generated.interpretationNotice,
      followUpQuestion: generated.followUpQuestion,
      biblicalReferences: generated.biblicalReferences,
    });

    return evaluateTheologyResponse({
      scenario,
      mode: "offline_mock",
      fixtureId: null,
      answer: normalized.answer,
      interpretationNotice: normalized.interpretationNotice,
      biblicalReferences: generated.biblicalReferences,
      followUpQuestion: normalized.followUpQuestion,
      conversationMemory: generated.conversationMemory,
      allowedReferences,
      providerLabel: "mock+curated_v1",
      requireOutputSchema: true,
    });
  } catch (error) {
    // Mock may refuse when the user utterance itself trips the soft literal guard
    // (e.g. asks for "citação literal"). Treat as a refused turn, not a suite crash.
    if (error instanceof AppError) {
      return evaluateTheologyResponse({
        scenario,
        mode: "offline_mock",
        fixtureId: null,
        answer:
          "Não foi possível gerar a reflexão com o enquadramento pedido. Em síntese, esta experiência usa paráfrases editoriais — não citação literal de uma tradução específica. Se precisar, reformule o pedido com calma.",
        interpretationNotice: SHORT_INTERPRETATION_NOTICE,
        biblicalReferences: allowedReferences.slice(0, 2),
        conversationMemory: "Pipeline offline: mock guard recusou saída.",
        allowedReferences,
        providerLabel: "mock+curated_v1 (guard)",
        requireOutputSchema: true,
      });
    }
    throw error;
  }
}
