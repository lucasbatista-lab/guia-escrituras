/**
 * Lightweight operational milestones for subscriber detail.
 * Timestamps/metadata only — never message or spiritual content.
 */

export interface AdminOperationalMilestone {
  key: string;
  label: string;
  at: string | null;
  detail?: string;
  known: boolean;
}

export interface AdminOperationalMilestonesInput {
  createdAt: string;
  signupIntentStatus: string | null;
  checkoutCreatedAt: string | null;
  subscriptionCreatedAt: string | null;
  subscriptionStatus: string | null;
  firstConversationAt: string | null;
  lastActivityAt: string | null;
  firstJourneyStartedAt: string | null;
  journeyCompletedAt: string | null;
  cancelAtPeriodEnd: boolean | null;
  currentPeriodEnd: string | null;
}

export function buildAdminOperationalMilestones(
  input: AdminOperationalMilestonesInput,
): AdminOperationalMilestone[] {
  const confirmationLabel =
    input.signupIntentStatus === "awaiting_confirmation"
      ? "Aguardando confirmação conforme fluxo de cadastro"
      : input.signupIntentStatus
        ? `Estágio de cadastro: ${input.signupIntentStatus}`
        : "Estágio de confirmação desconhecido";

  const milestones: AdminOperationalMilestone[] = [
    {
      key: "account_created",
      label: "Conta criada",
      at: input.createdAt,
      known: true,
    },
    {
      key: "confirmation",
      label: confirmationLabel,
      at: null,
      detail: input.signupIntentStatus
        ? "Evidência em signup_intents (não Auth API isolada)."
        : "Sem signup_intent vinculado com estágio conhecido.",
      known: Boolean(input.signupIntentStatus),
    },
    {
      key: "checkout_created",
      label: "Checkout criado",
      at: input.checkoutCreatedAt,
      known: Boolean(input.checkoutCreatedAt),
    },
    {
      key: "subscription",
      label: "Assinatura iniciada / conhecida",
      at: input.subscriptionCreatedAt,
      detail: input.subscriptionStatus
        ? `Status atual: ${input.subscriptionStatus}`
        : undefined,
      known: Boolean(input.subscriptionCreatedAt || input.subscriptionStatus),
    },
    {
      key: "first_conversation",
      label: "Primeira conversa",
      at: input.firstConversationAt,
      known: Boolean(input.firstConversationAt),
      detail: input.firstConversationAt
        ? undefined
        : "Nenhuma conversa registrada (ou ainda não lida).",
    },
    {
      key: "last_activity",
      label: "Última atividade",
      at: input.lastActivityAt,
      known: Boolean(input.lastActivityAt),
      detail: input.lastActivityAt
        ? "Com base em usage_events (contínuo)."
        : "Sem usage_events registrados.",
    },
    {
      key: "journey_started",
      label: "Primeira Jornada iniciada",
      at: input.firstJourneyStartedAt,
      known: Boolean(input.firstJourneyStartedAt),
    },
    {
      key: "journey_completed",
      label: "Jornada concluída",
      at: input.journeyCompletedAt,
      known: Boolean(input.journeyCompletedAt),
    },
    {
      key: "cancel_scheduled",
      label: "Cancelamento agendado",
      at:
        input.cancelAtPeriodEnd && input.currentPeriodEnd
          ? input.currentPeriodEnd
          : null,
      detail:
        input.cancelAtPeriodEnd === true
          ? "cancel_at_period_end ativo"
          : input.cancelAtPeriodEnd === false
            ? "Sem cancelamento agendado"
            : "Estado de cancelamento indisponível",
      known: input.cancelAtPeriodEnd != null,
    },
    {
      key: "current_status",
      label: "Status atual",
      at: null,
      detail: input.subscriptionStatus ?? "sem assinatura efetiva",
      known: true,
    },
  ];

  return milestones;
}
