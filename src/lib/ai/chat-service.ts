import "server-only";

import {
  createAiProvider,
  resolveChatModel,
  isOpenAiConfigured,
} from "@/lib/ai/gateway";
import type { ChatRequestInput, ChatResponsePayload } from "@/lib/ai/chat-schema";
import type { ChatStreamEvent } from "@/lib/ai/chat-stream-protocol";
import type { AiGenerateResult } from "@/lib/ai/types";
import { resolveAuthorizedPersonaKey } from "@/lib/ai/chat-persona";
import type { AuthUserContext } from "@/lib/auth";
import { requiresRealOpenAiForChat } from "@/config/runtime";
import {
  FEATURE_TEMPORARILY_DISABLED_CODE,
  featureDisabledUserMessage,
  isFeatureDisabled,
} from "@/config/feature-kill-switches";
import { getRepositories } from "@/lib/database/repositories";
import {
  canUseDeepResponseOnDemand,
  DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
  resolveEntitlements,
} from "@/lib/entitlements";

import { logger } from "@/lib/logging/logger";
import { AppError } from "@/lib/safety";
import {
  buildCrisisAnswer,
  CRISIS_INTERPRETATION_NOTICE,
  detectCrisisMessage,
} from "@/lib/safety/crisis";
import { theologyPolicyResolver } from "@/lib/theology";
import { createBiblicalGroundingProvider } from "@/lib/biblical";
import {
  groundingLimitForDepth,
  resolveChatResponseDepth,
} from "@/lib/ai/response-depth";
import {
  RECENT_CONTEXT_MESSAGE_LIMIT,
  sanitizeConversationMemory,
  selectContextMessages,
} from "@/lib/ai/conversation-memory";
import { normalizeAssistantPresentation } from "@/lib/ai/normalize-assistant-presentation";
import { assertDeepAnswerSubstantive } from "@/lib/ai/deep-response-completeness";
import { tryAcquireChatTurnLock } from "@/lib/ai/chat-turn-lock";
import {
  mapOpenAiProviderError,
  openAiFailureToAppError,
} from "@/lib/ai/openai-errors";
import {
  calculateTokenCost,
  evaluateDailyBurst,
  evaluateMonthlyBudget,
  evaluateShortRateLimits,
  getBudgetConfig,
  getShortRateLimitConfig,
  getUsdBrlPlanningRate,
  usageLevelLabel,
  UnknownModelRateError,
} from "@/lib/usage";
import { currentYearMonth } from "@/lib/utils";
import { maskUserId } from "@/lib/logging/mask";

function startOfUtcDayIso(date = new Date()): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}

function secondsAgoIso(seconds: number, now = new Date()): string {
  return new Date(now.getTime() - seconds * 1000).toISOString();
}

export async function runChatTurn(input: {
  requestId: string;
  auth: AuthUserContext;
  body: ChatRequestInput;
  abortSignal?: AbortSignal;
}): Promise<ChatResponsePayload> {
  let completed: ChatResponsePayload | undefined;
  for await (const event of runChatTurnStream(input)) {
    if (event.type === "completed") {
      completed = event.payload;
    }
    if (event.type === "error") {
      throw new AppError(
        event.code,
        event.code,
        503,
        event.message,
      );
    }
  }
  if (!completed) {
    throw new AppError(
      "ai_failed",
      "ai_failed",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }
  return completed;
}

export async function* runChatTurnStream(input: {
  requestId: string;
  auth: AuthUserContext;
  body: ChatRequestInput;
  abortSignal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const { requestId, auth, body } = input;

  if (isFeatureDisabled("chat")) {
    throw new AppError(
      FEATURE_TEMPORARILY_DISABLED_CODE,
      FEATURE_TEMPORARILY_DISABLED_CODE,
      503,
      featureDisabledUserMessage("chat"),
    );
  }

  // Subscription gate BEFORE any persistence (and before personalization).
  if (!auth.planKey) {
    throw new AppError(
      "subscription_required",
      "subscription_required",
      402,
      "É necessária uma assinatura ativa para conversar. Não há plano gratuito.",
    );
  }

  if (!auth.spiritualProfile.onboardingCompleted) {
    throw new AppError(
      "personalization_required",
      "personalization_required",
      403,
      "Personalize sua experiência antes de conversar.",
    );
  }

  const entitlements = resolveEntitlements({ planKey: auth.planKey });

  if (!entitlements.has("chat_standard")) {
    throw new AppError(
      "missing_entitlement",
      "missing_entitlement",
      403,
      "Seu plano atual não inclui conversas.",
    );
  }

  // Crisis detection runs before commercial gates so distressed users never
  // receive budget/burst/rate 429 instead of the safety template.
  // preferDeep is per-turn only — never mutates profile preferredDepth.
  const crisisPreview = detectCrisisMessage(body.message);
  if (!crisisPreview.matched) {
    if (body.preferDeep && !canUseDeepResponseOnDemand(auth.planKey)) {
      throw new AppError(
        "deep_response_not_entitled",
        "deep_response_not_entitled",
        403,
        DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
      );
    }

    if (body.preferDeep && isFeatureDisabled("deepen")) {
      throw new AppError(
        FEATURE_TEMPORARILY_DISABLED_CODE,
        FEATURE_TEMPORARILY_DISABLED_CODE,
        503,
        featureDisabledUserMessage("deepen"),
      );
    }

    // OpenAI is only required for ordinary (non-crisis) turns.
    if (requiresRealOpenAiForChat() && !isOpenAiConfigured()) {
      throw new AppError(
        "openai_unavailable",
        "openai_unavailable",
        503,
        "O chat está temporariamente indisponível. Tente novamente mais tarde.",
      );
    }
  }

  const repos = getRepositories();
  const turnStartedMs = Date.now();

  // Idempotency: if this request_id already produced an assistant message, return it.
  // Unique index messages_user_request_role_uidx also guards concurrent inserts (23505).
  const existingAssistant = await repos.messages.findByRequestId(
    auth.userId,
    requestId,
    "assistant",
  );
  if (existingAssistant) {
    const yearMonth = currentYearMonth();
    const monthly = await repos.usage.getMonthly(auth.userId, yearMonth);
    const budgetConfig = getBudgetConfig(auth.planKey);
    const budget = evaluateMonthlyBudget({
      usedBrlCents: monthly.usedBrlCents,
      config: budgetConfig,
    });
    logger.info("chat_turn_idempotent_hit", {
      requestId,
      userId: maskUserId(auth.userId),
      conversationId: existingAssistant.conversationId,
      flowStatus: "idempotent_return",
      durationMs: Date.now() - turnStartedMs,
      streamed: true,
    });
    // Do not expose internal idempotency wording in the public notice field.
    // Notice/follow-up are not persisted on MessageRecord (no migration).
    const payload: ChatResponsePayload = {
      answer: existingAssistant.content,
      biblicalReferences: existingAssistant.biblicalReferences,
      interpretationNotice: "",
      usage: {
        level:
          budget.level === "blocked" ? "near_limit" : budget.level,
        label: usageLevelLabel(
          budget.level === "blocked" ? "near_limit" : budget.level,
        ),
        inputTokens: 0,
        outputTokens: 0,
      },
      requestId,
      conversationId: existingAssistant.conversationId,
      provider: "openai",
    };
    yield {
      type: "started",
      requestId,
      conversationId: existingAssistant.conversationId,
    };
    yield { type: "completed", requestId, payload };
    return;
  }

  // Process-local single-flight: same requestId must not call the AI twice here.
  // Cross-instance races still rely on unique indexes (documented limitation).
  const turnLock = tryAcquireChatTurnLock(auth.userId, requestId);
  if (!turnLock) {
    logger.info("chat_turn_in_progress", {
      requestId,
      userId: maskUserId(auth.userId),
      flowStatus: "conflict_in_flight",
      durationMs: Date.now() - turnStartedMs,
    });
    throw new AppError(
      "turn_in_progress",
      "turn_in_progress",
      409,
      "Sua reflexão já está sendo preparada. Aguarde um momento antes de enviar de novo.",
      5,
    );
  }

  try {
  // Re-check assistant under the lock (another instance may have finished).
  const assistantUnderLock = await repos.messages.findByRequestId(
    auth.userId,
    requestId,
    "assistant",
  );
  if (assistantUnderLock) {
    logger.info("chat_turn_idempotent_hit", {
      requestId,
      userId: maskUserId(auth.userId),
      conversationId: assistantUnderLock.conversationId,
      flowStatus: "idempotent_return_under_lock",
      durationMs: Date.now() - turnStartedMs,
    });
    yield {
      type: "started",
      requestId,
      conversationId: assistantUnderLock.conversationId,
    };
    yield {
      type: "completed",
      requestId,
      payload: {
        answer: assistantUnderLock.content,
        biblicalReferences: assistantUnderLock.biblicalReferences,
        interpretationNotice:
          "Resposta recuperada de uma solicitação anterior (idempotente).",
        usage: {
          level: "normal",
          label: usageLevelLabel("normal"),
          inputTokens: 0,
          outputTokens: 0,
        },
        requestId,
        conversationId: assistantUnderLock.conversationId,
        provider: "openai",
      },
    };
    return;
  }

  const personaResolution = resolveAuthorizedPersonaKey({
    requested: body.personaKey,
    traditionKey: auth.spiritualProfile.traditionKey,
    saintsContentEnabled: auth.spiritualProfile.saintsContentEnabled,
  });
  const personaKey = personaResolution.personaKey;
  if (personaResolution.fellBack && body.personaKey !== personaKey) {
    logger.info("chat_persona_fallback", {
      requestId,
      userId: maskUserId(auth.userId),
      requested: String(body.personaKey).slice(0, 32),
      personaKey,
    });
  }

  // -------------------------------------------------------------------------
  // Crisis safety intercept — BEFORE budget / burst / short rate limits.
  // Deterministic template; no OpenAI; no plan-usage gate; no deepen.
  // Logs category only (never user text).
  // -------------------------------------------------------------------------
  if (crisisPreview.matched) {
    let crisisConversation =
      body.conversationId != null
        ? await repos.conversations.getByIdForUser(
            body.conversationId,
            auth.userId,
          )
        : null;

    if (body.conversationId && !crisisConversation) {
      throw new AppError(
        "conversation_not_found",
        "conversation_not_found",
        404,
        "Conversa não encontrada.",
      );
    }

    if (!crisisConversation) {
      crisisConversation = await repos.conversations.create({
        userId: auth.userId,
        personaKey,
        title: body.message.slice(0, 80),
      });
    }

    await repos.messages.insertUserMessage({
      conversationId: crisisConversation.id,
      userId: auth.userId,
      content: body.message,
      requestId,
    });

    const crisisAnswer = buildCrisisAnswer(crisisPreview.category);
    logger.info("crisis_safety_intercept", {
      requestId,
      userId: maskUserId(auth.userId),
      conversationId: crisisConversation.id,
      category: crisisPreview.category,
      signalIds: crisisPreview.signalIds,
      flowStatus: "crisis_intercept",
      durationMs: Date.now() - turnStartedMs,
    });

    try {
      await repos.messages.insertAssistantMessage({
        conversationId: crisisConversation.id,
        userId: auth.userId,
        content: crisisAnswer,
        biblicalReferences: [],
        requestId,
      });
    } catch (error) {
      logger.error("crisis_assistant_persist_failed", {
        requestId,
        userId: maskUserId(auth.userId),
        category: crisisPreview.category,
        err: error instanceof Error ? error.message : "unknown",
      });
    }

    // Usage event records zero cost for ops visibility — does not consume plan budget.
    await repos.usage.insertEvent({
      userId: auth.userId,
      conversationId: crisisConversation.id,
      requestId,
      featureType: "chat_standard",
      model: "crisis_safety",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsdMicros: 0,
      estimatedCostBrlCents: 0,
      latencyMs: Date.now() - turnStartedMs,
      success: true,
    });

    yield {
      type: "started",
      requestId,
      conversationId: crisisConversation.id,
    };
    yield {
      type: "assistant_snapshot",
      requestId,
      answer: crisisAnswer,
    };
    yield {
      type: "completed",
      requestId,
      payload: {
        answer: crisisAnswer,
        biblicalReferences: [],
        interpretationNotice: CRISIS_INTERPRETATION_NOTICE,
        usage: {
          level: "normal",
          label: usageLevelLabel("normal"),
          inputTokens: 0,
          outputTokens: 0,
        },
        requestId,
        conversationId: crisisConversation.id,
        provider: "mock",
        safetyMode: "crisis",
      },
    };
    return;
  }

  // Ordinary turns only: commercial usage gates (parallel independent reads).
  const budgetConfig = getBudgetConfig(auth.planKey);
  const yearMonth = currentYearMonth();
  const shortConfig = getShortRateLimitConfig();
  const [
    monthly,
    requestsToday,
    existingUser,
    existingUsage,
    countLast60s,
    countLast10m,
  ] = await Promise.all([
    repos.usage.getMonthly(auth.userId, yearMonth),
    repos.usage.countRequestsSince(auth.userId, startOfUtcDayIso()),
    repos.messages.findByRequestId(auth.userId, requestId, "user"),
    repos.usage.findEventByRequestId(auth.userId, requestId),
    repos.messages.countUserMessagesSince(
      auth.userId,
      secondsAgoIso(shortConfig.perMinute.windowSeconds),
    ),
    repos.messages.countUserMessagesSince(
      auth.userId,
      secondsAgoIso(shortConfig.perTenMinutes.windowSeconds),
    ),
  ]);

  const budget = evaluateMonthlyBudget({
    usedBrlCents: monthly.usedBrlCents,
    config: budgetConfig,
  });
  if (budget.blocked) {
    throw new AppError(
      "budget_exceeded",
      "budget_exceeded",
      429,
      budget.blockReason ??
        "Você atingiu a margem de uso do seu plano por enquanto. Tente novamente mais tarde.",
    );
  }

  const burst = evaluateDailyBurst({
    requestsToday,
    dailyBurstLimit: budgetConfig.dailyBurstLimit,
  });
  if (burst.blocked) {
    throw new AppError(
      "burst_exceeded",
      "burst_exceeded",
      429,
      "Você chegou ao limite diário de segurança. Pode continuar amanhã.",
    );
  }

  const isIdempotentRetry = Boolean(existingUser || existingUsage);

  if (!isIdempotentRetry) {
    const short = evaluateShortRateLimits({
      countLast60s,
      countLast10m,
      config: shortConfig,
    });
    if (short.blocked) {
      throw new AppError(
        "rate_limited",
        "rate_limited",
        429,
        "Você enviou várias mensagens em pouco tempo. Aguarde um momento e tente novamente.",
        short.retryAfterSeconds,
      );
    }
  }

  let conversation =
    body.conversationId != null
      ? await repos.conversations.getByIdForUser(
          body.conversationId,
          auth.userId,
        )
      : null;

  if (body.conversationId && !conversation) {
    throw new AppError(
      "conversation_not_found",
      "conversation_not_found",
      404,
      "Conversa não encontrada.",
    );
  }

  if (!conversation) {
    conversation = await repos.conversations.create({
      userId: auth.userId,
      personaKey,
      title: body.message.slice(0, 80),
    });
  }

  yield {
    type: "started",
    requestId,
    conversationId: conversation.id,
  };

  if (input.abortSignal?.aborted) {
    throw openAiFailureToAppError(new Error("aborted"));
  }

  // Idempotent user insert: same requestId must not create a second user row.
  // If a prior attempt already stored the user message (AI failed afterward), reuse it.
  const persistedUser = await repos.messages.insertUserMessage({
    conversationId: conversation.id,
    userId: auth.userId,
    content: body.message,
    requestId,
  });

  // Fetch enough history so that after excluding the current turn we still have
  // up to RECENT_CONTEXT_MESSAGE_LIMIT prior messages.
  const [recent, summary] = await Promise.all([
    repos.messages.listRecent(
      conversation.id,
      auth.userId,
      RECENT_CONTEXT_MESSAGE_LIMIT + 2,
    ),
    repos.summaries.get(conversation.id, auth.userId),
  ]);
  const contextMessages = selectContextMessages({
    recentChronological: recent,
    currentRequestId: requestId,
    currentMessageId: persistedUser.id,
    limit: RECENT_CONTEXT_MESSAGE_LIMIT,
  });
  const summaryUsed = Boolean(summary?.summary?.trim());

  const policy = theologyPolicyResolver.resolve({
    traditionKey: auth.spiritualProfile.traditionKey,
    personaKey,
    userPrefs: auth.spiritualProfile,
  });

  const responseDepth = resolveChatResponseDepth({
    preferredDepth: auth.spiritualProfile.preferredDepth,
    preferDeep: Boolean(body.preferDeep),
  });
  const groundingLimit = groundingLimitForDepth(responseDepth);

  let grounding;
  try {
    const biblical = createBiblicalGroundingProvider();
    grounding = biblical.retrieve({
      question: body.message,
      traditionKey: auth.spiritualProfile.traditionKey,
      personaKey,
      allowsSaintsContent: policy.allowsSaintsContent,
      varietySeed: requestId,
      limit: groundingLimit,
    });
  } catch (error) {
    logger.error("biblical_grounding_failed", {
      requestId,
      userId: maskUserId(auth.userId),
      failureType: "biblical_grounding",
      flowStatus: "failed",
      err: error instanceof Error ? error.message : "unknown",
    });
    if (error instanceof AppError) throw error;
    throw new AppError(
      "biblical_corpus_unavailable",
      "biblical_corpus_unavailable",
      503,
      "O chat está temporariamente indisponível. Tente novamente mais tarde.",
    );
  }

  logger.info("biblical_grounding_retrieved", {
    requestId,
    userId: maskUserId(auth.userId),
    groundingProvider: grounding.groundingProvider,
    groundingCount: grounding.groundingCount,
    retrievedReferenceIds: grounding.retrievedReferenceIds,
    responseDepth,
  });

  const useMockModel = auth.demoMode || !isOpenAiConfigured();
  const model = useMockModel
    ? "mock"
    : resolveChatModel({ preferDeep: Boolean(body.preferDeep) });

  const provider = createAiProvider();
  const preOpenaiMs = Date.now() - turnStartedMs;
  let openaiStreamStartedAt: number | null = null;
  let openaiFirstDeltaAt: number | null = null;
  let result: AiGenerateResult | undefined;
  try {
    const snapshotQueue: Array<
      | { kind: "snapshot"; answer: string }
      | { kind: "done"; value: AiGenerateResult }
      | { kind: "fail"; error: unknown }
    > = [];
    let notify: (() => void) | null = null;
    const waitForItem = () =>
      new Promise<void>((resolve) => {
        notify = resolve;
      });
    const enqueue = (
      item: (typeof snapshotQueue)[number],
    ) => {
      snapshotQueue.push(item);
      notify?.();
      notify = null;
    };

    const generatePromise = provider.generate({
      messages: contextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      currentUserMessage: body.message,
      theologyPolicy: policy,
      model,
      conversationSummary: summary?.summary ?? null,
      requestId,
      grounding,
      responseDepth,
      abortSignal: input.abortSignal,
      onAnswerSnapshot: (answer) => {
        enqueue({ kind: "snapshot", answer });
      },
      onStreamTelemetry: (event) => {
        if (event.openaiStreamStartedAt) {
          openaiStreamStartedAt = event.openaiStreamStartedAt;
        }
        if (event.openaiFirstDeltaAt) {
          openaiFirstDeltaAt = event.openaiFirstDeltaAt;
        }
      },
    }).then(
      (value) => enqueue({ kind: "done", value }),
      (error) => enqueue({ kind: "fail", error }),
    );

    let finished = false;
    while (!finished) {
      if (snapshotQueue.length === 0) {
        await waitForItem();
      }
      const item = snapshotQueue.shift();
      if (!item) continue;
      if (item.kind === "snapshot") {
        yield {
          type: "assistant_snapshot",
          requestId,
          answer: item.answer,
        };
      } else if (item.kind === "done") {
        result = item.value;
        finished = true;
      } else {
        throw item.error;
      }
    }
    await generatePromise;
  } catch (error) {
    if (error instanceof AppError) {
      logger.error("ai_generate_failed", {
        requestId,
        userId: maskUserId(auth.userId),
        failureType: error.code,
        flowStatus: "failed",
        durationMs: Date.now() - turnStartedMs,
        err: error.message,
      });
      throw error;
    }
    const mapped = mapOpenAiProviderError(error);
    logger.error("ai_generate_failed", {
      requestId,
      userId: maskUserId(auth.userId),
      failureType: mapped.failureType,
      flowStatus: "failed",
      durationMs: Date.now() - turnStartedMs,
      err: error instanceof Error ? error.message : "unknown",
    });
    throw openAiFailureToAppError(error);
  }

  if (!result) {
    throw new AppError(
      "ai_failed",
      "ai_failed",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }

  const presented = normalizeAssistantPresentation({
    answer: result.answer,
    biblicalReferences: result.biblicalReferences,
    interpretationNotice: result.interpretationNotice,
    followUpQuestion: result.followUpQuestion,
  });

  // Aprofundar must not succeed with intro/footer/refs shell and no reflection body.
  if (body.preferDeep) {
    try {
      assertDeepAnswerSubstantive(presented.answer);
    } catch (error) {
      logger.error("deep_response_incomplete", {
        requestId,
        userId: maskUserId(auth.userId),
        responseDepth,
        answerChars: presented.answer.length,
        refCount: result.biblicalReferences.length,
        hasFollowUp: Boolean(presented.followUpQuestion),
        flowStatus: "failed",
        durationMs: Date.now() - turnStartedMs,
      });
      throw error;
    }
  }

  const persistStartedMs = Date.now();
  // Provider output is validated before this point; never persist invalid assistant content.
  let costs;
  try {
    costs = calculateTokenCost({
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      usdBrlPlanningRate: getUsdBrlPlanningRate(),
    });
  } catch (error) {
    if (error instanceof UnknownModelRateError) {
      logger.error("unknown_model_planning_rate", {
        requestId,
        model: result.model,
      });
      if (requiresRealOpenAiForChat()) {
        throw new AppError(
          "model_rate_unconfigured",
          "model_rate_unconfigured",
          503,
          "O chat está temporariamente indisponível. Tente novamente mais tarde.",
        );
      }
      costs = { estimatedCostUsdMicros: 0, estimatedCostBrlCents: 0 };
    } else {
      throw error;
    }
  }

  let persistWarning: string | undefined;
  let assistantPersisted = false;

  try {
    const priorAssistant = await repos.messages.findByRequestId(
      auth.userId,
      requestId,
      "assistant",
    );
    await repos.messages.insertAssistantMessage({
      conversationId: conversation.id,
      userId: auth.userId,
      content: presented.answer,
      biblicalReferences: result.biblicalReferences,
      requestId,
    });
    // First successful insert for this requestId updates memory; retries skip.
    assistantPersisted = !priorAssistant;
  } catch (error) {
    logger.error("assistant_persist_failed", {
      requestId,
      userId: maskUserId(auth.userId),
      err: error instanceof Error ? error.message : "unknown",
    });
    persistWarning =
      "A resposta foi gerada, mas a persistência ficou incompleta.";
  }

  if (assistantPersisted) {
    const memory = sanitizeConversationMemory(result.conversationMemory ?? "");
    if (memory) {
      try {
        await repos.summaries.upsert({
          conversationId: conversation.id,
          userId: auth.userId,
          summary: memory,
        });
      } catch (error) {
        logger.error("conversation_summary_upsert_failed", {
          requestId,
          userId: maskUserId(auth.userId),
          err: error instanceof Error ? error.message : "unknown",
        });
        persistWarning =
          persistWarning ??
          "A resposta foi salva; a memória da conversa pode atrasar.";
      }
    }
  }

  const usageInsert = await repos.usage.insertEvent({
    userId: auth.userId,
    conversationId: conversation.id,
    requestId,
    featureType: body.preferDeep ? "chat_deep" : "chat_standard",
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostUsdMicros: costs.estimatedCostUsdMicros,
    estimatedCostBrlCents: costs.estimatedCostBrlCents,
    latencyMs: result.latencyMs,
    success: true,
  });

  let updatedMonthly = monthly;
  if (usageInsert.inserted) {
    try {
      updatedMonthly = await repos.usage.incrementMonthly({
        userId: auth.userId,
        yearMonth,
        addBrlCents: costs.estimatedCostBrlCents,
      });
    } catch (error) {
      logger.error("usage_monthly_failed", {
        requestId,
        userId: maskUserId(auth.userId),
        err: error instanceof Error ? error.message : "unknown",
      });
      persistWarning =
        persistWarning ??
        "Uso registrado parcialmente; totais mensais podem atrasar.";
    }
  }

  const updatedBudget = evaluateMonthlyBudget({
    usedBrlCents: updatedMonthly.usedBrlCents,
    config: budgetConfig,
  });

  const dbPostMs = Date.now() - persistStartedMs;
  const responseCompleteMs = Date.now() - turnStartedMs;
  const openaiTtftMs =
    result.openaiTtftMs ??
    (openaiFirstDeltaAt != null
      ? Math.max(0, openaiFirstDeltaAt - (turnStartedMs + preOpenaiMs))
      : null);

  logger.info("chat_turn_completed", {
    requestId,
    userId: maskUserId(auth.userId),
    conversationId: conversation.id,
    provider: result.provider,
    model: result.model,
    groundingProvider: result.groundingProvider,
    groundingCount: result.groundingCount,
    retrievedReferenceIds: result.retrievedReferenceIds,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostBrlCents: costs.estimatedCostBrlCents,
    latencyMs: result.latencyMs,
    success: true,
    usageInserted: usageInsert.inserted,
    featureType: body.preferDeep ? "chat_deep" : "chat_standard",
    persistWarning: persistWarning ?? null,
    recentMessageCount: contextMessages.length,
    summaryUsed,
    summaryLength: sanitizeConversationMemory(result.conversationMemory ?? "")
      .length,
    depth: responseDepth,
    flowStatus: "completed",
    durationMs: responseCompleteMs,
    isIdempotentRetry,
    streamed: result.streamed === true,
    // usage_events has no metadata column — context telemetry lives on this log.
    request_start: turnStartedMs,
    pre_openai_ms: preOpenaiMs,
    openai_stream_started: openaiStreamStartedAt != null,
    openai_ttft_ms: openaiTtftMs,
    openai_complete_ms: result.openaiCompleteMs ?? result.latencyMs,
    db_post_ms: dbPostMs,
    response_complete_ms: responseCompleteMs,
  });

  yield {
    type: "completed",
    requestId,
    payload: {
      answer: presented.answer,
      biblicalReferences: result.biblicalReferences,
      interpretationNotice: presented.interpretationNotice,
      followUpQuestion: presented.followUpQuestion,
      usage: {
        level:
          updatedBudget.level === "blocked"
            ? "near_limit"
            : updatedBudget.level,
        label: usageLevelLabel(
          updatedBudget.level === "blocked"
            ? "near_limit"
            : updatedBudget.level,
        ),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
      requestId,
      conversationId: conversation.id,
      provider: result.provider,
    },
  };
  return;
  } finally {
    turnLock.release();
  }
}
