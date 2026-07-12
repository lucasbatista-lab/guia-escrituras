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
import { resolveEntitlements } from "@/lib/entitlements";
import { logger } from "@/lib/logging/logger";
import { AppError } from "@/lib/safety";
import { theologyPolicyResolver } from "@/lib/theology";
import {
  calculateTokenCost,
  evaluateDailyBurst,
  evaluateMonthlyBudget,
  getBudgetConfig,
  getUsdBrlPlanningRate,
  usageLevelLabel,
} from "@/lib/usage";
import { currentYearMonth } from "@/lib/utils";

function startOfUtcDayIso(date = new Date()): string {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  ).toISOString();
}

export async function runChatTurn(input: {
  requestId: string;
  auth: AuthUserContext;
  body: ChatRequestInput;
}): Promise<ChatResponsePayload> {
  const { requestId, auth, body } = input;

  if (!auth.spiritualProfile.onboardingCompleted) {
    throw new AppError(
      "onboarding_required",
      "onboarding_required",
      403,
      "Conclua o onboarding antes de conversar.",
    );
  }

  if (!auth.planKey) {
    throw new AppError(
      "subscription_required",
      "subscription_required",
      402,
      "É necessária uma assinatura ativa para conversar. Não há plano gratuito.",
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

  if (body.preferDeep && !entitlements.has("chat_deep")) {
    throw new AppError(
      "deep_not_allowed",
      "deep_not_allowed",
      403,
      "Conversas profundas não estão disponíveis no seu plano.",
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

  await repos.messages.insertUserMessage({
    conversationId: conversation.id,
    userId: auth.userId,
    content: body.message,
    requestId,
  });

  const recent = await repos.messages.listRecent(
    conversation.id,
    auth.userId,
    8,
  );
  const summary = await repos.summaries.get(conversation.id, auth.userId);

  const policy = theologyPolicyResolver.resolve({
    traditionKey: auth.spiritualProfile.traditionKey,
    personaKey: body.personaKey,
    userPrefs: auth.spiritualProfile,
  });

  const useMockModel = auth.demoMode || !isOpenAiConfigured();
  const model = useMockModel
    ? "mock"
    : resolveChatModel({ preferDeep: Boolean(body.preferDeep) });

  const provider = createAiProvider();
  let result;
  try {
    result = await provider.generate({
      messages: recent.map((m) => ({
        role: m.role === "system" ? "system" : m.role,
        content: m.content,
      })),
      theologyPolicy: policy,
      model,
      conversationSummary: summary?.summary ?? null,
      requestId,
    });
  } catch (error) {
    logger.error("ai_generate_failed", {
      requestId,
      userId: auth.userId,
      err: error instanceof Error ? error.message : "unknown",
    });
    throw new AppError(
      "ai_failed",
      "ai_failed",
      503,
      "Não foi possível gerar a reflexão agora. Tente novamente.",
    );
  }

  const costs = calculateTokenCost({
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    usdBrlPlanningRate: getUsdBrlPlanningRate(),
  });

  let persistWarning: string | undefined;

  try {
    await repos.messages.insertAssistantMessage({
      conversationId: conversation.id,
      userId: auth.userId,
      content: result.answer,
      biblicalReferences: result.biblicalReferences,
      requestId,
    });
  } catch (error) {
    logger.error("assistant_persist_failed", {
      requestId,
      userId: auth.userId,
      err: error instanceof Error ? error.message : "unknown",
    });
    persistWarning =
      "A resposta foi gerada, mas a persistência ficou incompleta.";
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
        userId: auth.userId,
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
    userId: auth.userId,
    conversationId: conversation.id,
    provider: result.provider,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostBrlCents: costs.estimatedCostBrlCents,
    latencyMs: result.latencyMs,
    success: true,
    usageInserted: usageInsert.inserted,
    featureType: body.preferDeep ? "chat_deep" : "chat_standard",
    persistWarning: persistWarning ?? null,
  });

  return {
    answer: result.answer,
    biblicalReferences: result.biblicalReferences,
    interpretationNotice: persistWarning
      ? `${result.interpretationNotice} (${persistWarning})`
      : result.interpretationNotice,
    followUpQuestion: result.followUpQuestion,
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
