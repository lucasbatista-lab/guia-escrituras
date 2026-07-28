/**
 * Support SOP for the Admin support view — declares email-only support,
 * no ticket storage/queue. Pure data, safe to unit test.
 */

import { SUPPORT_CATEGORIES, SUPPORT_RESPONSE_NOTE } from "@/lib/support/help-center";

export { SUPPORT_CATEGORIES, SUPPORT_RESPONSE_NOTE };

export interface SupportTriageStep {
  step: number;
  title: string;
  description: string;
}

/** Ordered triage checklist — read-only guidance, never persisted state. */
export const SUPPORT_TRIAGE_STEPS: SupportTriageStep[] = [
  {
    step: 1,
    title: "Localizar o usuário",
    description:
      "Busque por e-mail, UUID ou nome em Usuários. Confira plano, status da assinatura e eventos de pagamento antes de responder.",
  },
  {
    step: 2,
    title: "Confirmar a categoria",
    description:
      "Releia o e-mail e enquadre em uma categoria do Help Center (acesso, cobrança, uso, privacidade, jornadas, cancelamento, técnico, outro).",
  },
  {
    step: 3,
    title: "Checar sinais operacionais",
    description:
      "Para cobrança/técnico: veja Eventos de pagamento e Incidentes antes de responder — evita pedir de novo o que já está no painel.",
  },
  {
    step: 4,
    title: "Responder por e-mail",
    description:
      "Responda pelo endereço de suporte configurado. Sem colar conteúdo de conversas do usuário na resposta.",
  },
  {
    step: 5,
    title: "Escalar se necessário",
    description:
      "Risco de crise, dado sensível ou dúvida jurídica: escalar internamente antes de responder — nunca aconselhamento pastoral/clínico pelo e-mail de suporte.",
  },
];

/** Honest capacity note — this view does not add a ticket queue or SLA engine. */
export const SUPPORT_CAPACITY_NOTE =
  "Suporte é só e-mail — sem fila de chamados, sem status, sem SLA automatizado neste painel. Esta tela é um guia de triagem, não um sistema de tickets.";
