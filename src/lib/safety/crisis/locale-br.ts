/**
 * Brazil-localized crisis resources (product launch locale).
 * Keep copy here — detection logic must not hardcode numbers.
 *
 * Sources (public, non-exclusive):
 * - CVV — Centro de Valorização da Vida: 188 (24h) — https://www.cvv.org.br/
 * - SAMU: 192
 * - Polícia Militar: 190
 * - Bombeiros: 193
 * - Disque 100 (direitos humanos / violência)
 *
 * Decision: Amém Chat operates initially for Brazil (pt-BR).
 * Other locales require a separate content module + product decision.
 */
export const CRISIS_LOCALE = "pt-BR" as const;

export const CRISIS_RESOURCES_BR = {
  locale: CRISIS_LOCALE,
  lines: [
    "CVV — Centro de Valorização da Vida: ligue 188 (24 horas) ou acesse cvv.org.br",
    "Em emergência médica: SAMU 192",
    "Em risco imediato de violência: Polícia 190",
    "Violação de direitos humanos / violência: Disque 100",
  ],
} as const;

export function buildCrisisAnswer(category: string): string {
  const resources = CRISIS_RESOURCES_BR.lines.map((l) => `• ${l}`).join("\n");

  const lead =
    category === "medical_emergency"
      ? "O que você descreve pode exigir ajuda médica imediata. Sua segurança vem primeiro."
      : category === "violence" || category === "abuse"
        ? "Se há risco de violência agora, priorize sua segurança e a de outras pessoas."
        : "Obrigado por falar sobre isso. Sua vida importa, e você não precisa enfrentar este momento sozinho(a).";

  return [
    lead,
    "",
    "Eu sou um assistente de reflexão baseado nas Escrituras — não sou Jesus, Deus, médico, terapeuta nem autoridade pastoral. Não diagnostico e não substituo atendimento humano de emergência.",
    "",
    "Por favor, busque ajuda humana agora:",
    resources,
    "",
    "Se puder, avise alguém de confiança ao seu lado. Quando estiver em segurança, você pode voltar aqui para uma conversa reflexiva — neste momento, o cuidado presencial e profissional é o passo certo.",
  ].join("\n");
}

export const CRISIS_INTERPRETATION_NOTICE =
  "Esta resposta de segurança foi gerada pela plataforma (sem modelo de IA) para priorizar ajuda humana imediata. Não é aconselhamento médico, jurídico ou pastoral.";
