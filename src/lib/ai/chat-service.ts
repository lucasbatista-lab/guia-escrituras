import { createAiProvider, resolveChatModel } from "@/lib/ai";
import type { ChatRequestInput, ChatResponsePayload } from "@/lib/ai/chat-schema";
import type { AuthUserContext } from "@/lib/auth";
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

/** In-memory demo store when Supabase is absent. */
const demoConversations = new Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
>();
const demoUsage = new Map<string, { usedBrlCents: number; requestsToday: number }>();

export async function runChatTurn(input: {
  requestId: string;
  auth: AuthUserContext;
  body: ChatRequestInput;
}): Promise<ChatResponsePayload> {
  const { requestId, auth, body } = input;
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

  if (!auth.spiritualProfile.onboardingCompleted && !auth.demoMode) {
    throw new AppError(
      "onboarding_required",
      "onboarding_required",
      403,
      "Conclua o onboarding antes de conversar.",
    );
  }

  const budgetConfig = getBudgetConfig(auth.planKey);
  const usageState = demoUsage.get(auth.userId) ?? {
    usedBrlCents: 0,
    requestsToday: 0,
  };

  const budget = evaluateMonthlyBudget({
    usedBrlCents: usageState.usedBrlCents,
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

  const burst = evaluateDailyBurst({
    requestsToday: usageState.requestsToday,
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

  const conversationId = body.conversationId ?? crypto.randomUUID();
  const history = demoConversations.get(conversationId) ?? [];
  const recent = history.slice(-8);

  const policy = theologyPolicyResolver.resolve({
    traditionKey: auth.spiritualProfile.traditionKey,
    personaKey: body.personaKey,
    userPrefs: auth.spiritualProfile,
  });

  const model = auth.demoMode
    ? "mock"
    : resolveChatModel({ preferDeep: Boolean(body.preferDeep) });

  const provider = createAiProvider();
  const result = await provider.generate({
    messages: [
      ...recent,
      { role: "user", content: body.message },
    ],
    theologyPolicy: policy,
    model,
    conversationSummary: null,
    requestId,
  });

  const costs = calculateTokenCost({
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    usdBrlPlanningRate: getUsdBrlPlanningRate(),
  });

  history.push({ role: "user", content: body.message });
  history.push({ role: "assistant", content: result.answer });
  demoConversations.set(conversationId, history);

  usageState.usedBrlCents += costs.estimatedCostBrlCents;
  usageState.requestsToday += 1;
  demoUsage.set(auth.userId, usageState);

  const updatedBudget = evaluateMonthlyBudget({
    usedBrlCents: usageState.usedBrlCents,
    config: budgetConfig,
  });

  logger.info("chat_turn_completed", {
    requestId,
    userId: auth.userId,
    conversationId,
    provider: result.provider,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    estimatedCostBrlCents: costs.estimatedCostBrlCents,
    latencyMs: result.latencyMs,
    success: true,
    featureType: body.preferDeep ? "chat_deep" : "chat_standard",
  });

  return {
    answer: result.answer,
    biblicalReferences: result.biblicalReferences,
    interpretationNotice: result.interpretationNotice,
    followUpQuestion: result.followUpQuestion,
    usage: {
      level: updatedBudget.level === "blocked" ? "near_limit" : updatedBudget.level,
      label: usageLevelLabel(
        updatedBudget.level === "blocked" ? "near_limit" : updatedBudget.level,
      ),
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    requestId,
    conversationId,
    provider: result.provider,
  };
}
