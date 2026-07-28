/**
 * Human labels for operational queues opened from the dashboard.
 * Presentation only — filter contracts unchanged.
 */

import type { AdminUserListFilters } from "./user-list-params";

export type AdminActiveQueue = {
  key: string;
  name: string;
  definition: string;
};

export function describeAdminActiveQueue(
  filters: AdminUserListFilters,
): AdminActiveQueue | null {
  if (filters.pastDueOnly) {
    return {
      key: "past_due",
      name: "Pagamentos em risco",
      definition: "Assinaturas com status past_due — cobrança em atraso.",
    };
  }
  if (filters.checkoutPendingOnly) {
    return {
      key: "checkout_pending",
      name: "Checkout parado",
      definition:
        "Signup intents ainda em checkout_created — pendente ou stuck.",
    };
  }
  if (filters.activeNoConversationOnly) {
    return {
      key: "active_no_conversation",
      name: "Assinou e nunca conversou",
      definition:
        "Assinantes ativos/trialing sem nenhuma conversa registrada.",
    };
  }
  if (filters.awaitingConfirmationOnly) {
    return {
      key: "awaiting_confirmation",
      name: "Aguardando confirmação",
      definition:
        "Fluxo de cadastro — signup_intent em awaiting_confirmation.",
    };
  }
  if (filters.cancelingOnly) {
    return {
      key: "canceling",
      name: "Cancelamento agendado",
      definition:
        "Renovação cancelada (cancel_at_period_end) com acesso ainda vigente.",
    };
  }
  if (filters.duplicatesOnly) {
    return {
      key: "duplicates",
      name: "Duplicidades",
      definition: "Usuários com mais de uma assinatura ativa/efetiva.",
    };
  }
  if (filters.inactiveDays) {
    return {
      key: `inactive_${filters.inactiveDays}`,
      name: `Inativo ≥ ${filters.inactiveDays} dias`,
      definition: `Sem atividade contínua pelo limiar de ${filters.inactiveDays} dias (inclui sem registro).`,
    };
  }
  if (filters.subscriptionStatus === "none") {
    return {
      key: "no_subscription",
      name: "Sem assinatura",
      definition: "Usuários confirmados sem plano efetivo.",
    };
  }
  return null;
}

export function buildAdminActiveFilterChips(
  filters: AdminUserListFilters,
): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = [];
  if (filters.q) chips.push({ label: "Busca", value: filters.q });
  if (filters.planKey && filters.planKey !== "any") {
    chips.push({ label: "Plano", value: filters.planKey });
  }
  if (filters.subscriptionStatus && filters.subscriptionStatus !== "any") {
    chips.push({ label: "Status", value: filters.subscriptionStatus });
  }
  if (filters.onboardingCompleted && filters.onboardingCompleted !== "any") {
    chips.push({
      label: "Onboarding",
      value: filters.onboardingCompleted === "yes" ? "concluído" : "pendente",
    });
  }
  if (filters.utmSource) chips.push({ label: "utm", value: filters.utmSource });
  if (filters.utmMedium) {
    chips.push({ label: "medium", value: filters.utmMedium });
  }
  if (filters.utmContent) {
    chips.push({ label: "content", value: filters.utmContent });
  }
  if (filters.createdFrom) {
    chips.push({ label: "De", value: filters.createdFrom.slice(0, 10) });
  }
  if (filters.createdTo) {
    chips.push({ label: "Até", value: filters.createdTo.slice(0, 10) });
  }
  const queue = describeAdminActiveQueue(filters);
  if (queue) chips.push({ label: "Fila", value: queue.name });
  return chips;
}
