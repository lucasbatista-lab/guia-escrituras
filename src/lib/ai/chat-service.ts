import "server-only";

import {
  createAiProvider,
  resolveChatModel,
  isOpenAiConfigured,
} from "@/lib/ai/gateway";
import type { ChatRequestInput, ChatResponsePayload } from "@/lib/ai/chat-schema";
import type { AuthUserContext } from "@/lib/auth";
import { requiresRealOpenAiForChat } from "@/config/runtime";
import { getRepositories } from "@/lib/database/repositories";
import {
  canUseDeepResponseOnDemand,
  DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
  resolveEntitlements,
} from "@/lib/entitlements";

import { logger } from "@/lib/logging/logger";
import { AppError } from "@/lib/safety";
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
}): Promise<ChatResponsePayload> {
  const { requestId, auth, body } = input;

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

  // preferDeep is per-turn only — never mutates profile preferredDepth.
  // Authorization uses effective planKey from auth (subscription), not client.
  if (body.preferDeep && !canUseDeepResponseOnDemand(auth.planKey)) {
    throw new AppError(
      "deep_response_not_entitled",
      "deep_response_not_entitled",
      403,
      DEEP_RESPONSE_NOT_ENTITLED_MESSAGE,
    );
  }

  if (requiresRealOpenAiForChat() && !isOpenAiConfigured()) {
    throw new AppError(
      "openai_unavailable",
      "openai_unavailable",
      503,
      "O chat está temporariamente indisponível. Tente novamente mais tarde.",
    );
  }

  const repos = getRepositories();

  // Idempotency: if this request_id already produced an assistant message, return it.
  // Unique index messages_user_request_role_uidx also guards concurrent inserts (23505).
  // Limitation: two in-flight requests with the same requestId may both call the AI
  // before either persists; the second insert loses the race and we re-read.
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
    return {
      answer: existingAssistant.content,
      biblicalReferences: existingAssistant.biblicalReferences,
      interpretationNotice:
        "Resposta recuperada de uma solicitação anterior (idempotente).",
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
  }

  const budgetConfig = getBudgetConfig(auth.planKey);
  const yearMonth = currentYearMonth();
  const monthly = await repos.usage.getMonthly(auth.userId, yearMonth);

  const budget = evaluateMonthlyBudget({
    usedBrlCents: monthly.usedBrlCents,
    config: budgetConfig,
  });
  if (budget.blocked) {
    throw new AppError(
      "budget_exceeded",
      "budget_exceeded",
      429,
      budget.blockReason ?? "Limite mensal atingido.",
    );
  }

  const requestsToday = await repos.usage.countRequestsSince(
    auth.userId,
    startOfUtcDayIso(),
  );
  const burst = evaluateDailyBurst({
    requestsToday,
    dailyBurstLimit: budgetConfig.dailyBurstLimit,
  });
  if (burst.blocked) {
    throw new AppError(
      "burst_exceeded",
      "burst_exceeded",
      429,
      "Você atingiu o limite diário de segurança. Tente novamente amanhã.",
    );
  }

  const existingUser = await repos.messages.findByRequestId(
    auth.userId,
    requestId,
    "user",
  );
  const existingUsage = await repos.usage.findEventByRequestId(
    auth.userId,
    requestId,
  );
  const isIdempotentRetry = Boolean(existingUser || existingUsage);

  if (!isIdempotentRetry) {
    const shortConfig = getShortRateLimitConfig();
    const [countLast60s, countLast10m] = await Promise.all([
      repos.messages.countUserMessagesSince(
        auth.userId,
        secondsAgoIso(shortConfig.perMinute.windowSeconds),
      ),
      repos.messages.countUserMessagesSince(
        auth.userId,
        secondsAgoIso(shortConfig.perTenMinutes.windowSeconds),
      ),
    ]);
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
        "Você está enviando mensagens rápido demais. Aguarde um momento e tente novamente.",
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
      personaKey: body.personaKey,
      title: body.message.slice(0, 80),
    });
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
  const recent = await repos.messages.listRecent(
    conversation.id,
    auth.userId,
    RECENT_CONTEXT_MESSAGE_LIMIT + 2,
  );
  const summary = await repos.summaries.get(conversation.id, auth.userId);
  const contextMessages = selectContextMessages({
    recentChronological: recent,
    currentRequestId: requestId,
    currentMessageId: persistedUser.id,
    limit: RECENT_CONTEXT_MESSAGE_LIMIT,
  });
  const summaryUsed = Boolean(summary?.summary?.trim());

  const policy = theologyPolicyResolver.resolve({
    traditionKey: auth.spiritualProfile.traditionKey,
    personaKey: body.personaKey,
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
      personaKey: body.personaKey,
      allowsSaintsContent: policy.allowsSaintsContent,
      varietySeed: requestId,
      limit: groundingLimit,
    });
  } catch (error) {
    logger.error("biblical_grounding_failed", {
      requestId,
      userId: maskUserId(auth.userId),
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
  let result;
  try {
    result = await provider.generate({
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
    });
  } catch (error) {
    logger.error("ai_generate_failed", {
      requestId,
      userId: maskUserId(auth.userId),
      err: error instanceof Error ? error.message : "unknown",
    });
    if (error instanceof AppError) throw error;
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
    // Context telemetry (logs only — usage_events has no metadata column).
    recentMessageCount: contextMessages.length,
    summaryUsed,
    summaryLength: sanitizeConversationMemory(result.conversationMemory ?? "")
      .length,
    depth: responseDepth,
  });

  return {
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
  };
}
