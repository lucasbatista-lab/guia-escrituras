import "server-only";

import { createAiProvider, resolveChatModel } from "@/lib/ai/gateway";
import { normalizeAssistantPresentation } from "@/lib/ai/normalize-assistant-presentation";
import { createBiblicalGroundingProvider } from "@/lib/biblical";
import { groundingLimitForDepth } from "@/lib/ai/response-depth";
import { theologyPolicyResolver } from "@/lib/theology";
import {
  buildCrisisAnswer,
  CRISIS_INTERPRETATION_NOTICE,
  detectCrisisMessage,
} from "@/lib/safety/crisis";
import { calculateTokenCost, getUsdBrlPlanningRate } from "@/lib/usage";
import type { PastoralLiveCase } from "./scenarios";

export type PastoralLiveTurnResult = {
  caseId: string;
  traditionKey: PastoralLiveCase["traditionKey"];
  theme: string;
  bucket: PastoralLiveCase["bucket"];
  criticalSafety: boolean;
  model: string;
  provider: "openai" | "crisis_intercept";
  safetyMode: "crisis" | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsdMicros: number;
  estimatedCostBrlCents: number;
  answer: string;
  followUpQuestion: string | null;
  interpretationNotice: string | null;
  biblicalReferences: Array<{
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
  }>;
  allowedReferences: Array<{
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
  }>;
  retrievedReferenceIds: string[];
  crisisCategory: string | null;
};

/**
 * Mirrors production chat generation path (crisis → policy → grounding → OpenAI → normalize)
 * without auth, entitlement, persistence, or streaming transport.
 */
export async function runPastoralLiveTurn(
  pastoralCase: PastoralLiveCase,
): Promise<PastoralLiveTurnResult> {
  const requestId = `live-pastoral-${pastoralCase.id}-${Date.now()}`;
  const started = Date.now();

  const crisis = detectCrisisMessage(pastoralCase.userMessage);
  if (crisis.matched) {
    const answer = buildCrisisAnswer(crisis.category);
    return {
      caseId: pastoralCase.id,
      traditionKey: pastoralCase.traditionKey,
      theme: pastoralCase.theme,
      bucket: pastoralCase.bucket,
      criticalSafety: pastoralCase.criticalSafety,
      model: "crisis_safety",
      provider: "crisis_intercept",
      safetyMode: "crisis",
      latencyMs: Date.now() - started,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsdMicros: 0,
      estimatedCostBrlCents: 0,
      answer,
      followUpQuestion: null,
      interpretationNotice: CRISIS_INTERPRETATION_NOTICE,
      biblicalReferences: [],
      allowedReferences: [],
      retrievedReferenceIds: [],
      crisisCategory: crisis.category,
    };
  }

  const theologyPolicy = theologyPolicyResolver.resolve({
    traditionKey: pastoralCase.traditionKey,
    personaKey: "jesus",
    userPrefs: {
      responseStyle: "pastoral",
      preferredDepth: "balanced",
      saintsContentEnabled: pastoralCase.saintsContentEnabled,
      preferredBibleTranslation: null,
      denomination: null,
    },
  });

  const biblical = createBiblicalGroundingProvider();
  const grounding = biblical.retrieve({
    question: pastoralCase.userMessage,
    traditionKey: pastoralCase.traditionKey,
    personaKey: "jesus",
    allowsSaintsContent: theologyPolicy.allowsSaintsContent,
    varietySeed: requestId,
    limit: groundingLimitForDepth("balanced"),
  });

  const model = resolveChatModel({ preferDeep: false });
  const provider = createAiProvider();
  const generated = await provider.generate({
    messages: pastoralCase.priorTurns ?? [],
    currentUserMessage: pastoralCase.userMessage,
    theologyPolicy,
    model,
    conversationSummary: null,
    requestId,
    grounding,
    responseDepth: "balanced",
  });

  const presented = normalizeAssistantPresentation({
    answer: generated.answer,
    interpretationNotice: generated.interpretationNotice,
    followUpQuestion: generated.followUpQuestion,
    biblicalReferences: generated.biblicalReferences,
  });

  const costs = calculateTokenCost({
    model: generated.model,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
    usdBrlPlanningRate: getUsdBrlPlanningRate(),
  });

  return {
    caseId: pastoralCase.id,
    traditionKey: pastoralCase.traditionKey,
    theme: pastoralCase.theme,
    bucket: pastoralCase.bucket,
    criticalSafety: pastoralCase.criticalSafety,
    model: generated.model,
    provider: "openai",
    safetyMode: null,
    latencyMs: generated.latencyMs || Date.now() - started,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
    estimatedCostUsdMicros: costs.estimatedCostUsdMicros,
    estimatedCostBrlCents: costs.estimatedCostBrlCents,
    answer: presented.answer,
    followUpQuestion: presented.followUpQuestion ?? null,
    interpretationNotice: presented.interpretationNotice ?? null,
    biblicalReferences: generated.biblicalReferences.map((ref) => ({
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
    })),
    allowedReferences: grounding.allowedReferences.map((ref) => ({
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      ...(ref.verseEnd != null ? { verseEnd: ref.verseEnd } : {}),
    })),
    retrievedReferenceIds: grounding.retrievedReferenceIds,
    crisisCategory: null,
  };
}
