/**
 * Brazil-localized crisis resources (product launch locale).
 * Keep copy here — detection logic must not hardcode numbers.
 *
 * Sources (public, official):
 * - CVV — Centro de Valorização da Vida: 188 (24h, gratuito) — https://www.cvv.org.br/
 *   https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/suicidio-prevencao
 * - SAMU: 192 (emergência médica) — Ministério da Saúde
 * - Polícia Militar: 190
 * - Disque 100 (direitos humanos / violência)
 *
 * Decision: Amém Chat operates initially for Brazil (pt-BR).
 * Other locales require a separate content module + product decision.
 */
export const CRISIS_LOCALE = "pt-BR" as const;

export const CRISIS_RESOURCES_BR = {
  locale: CRISIS_LOCALE,
  lines: [
    "CVV — apoio emocional e prevenção do suicídio: ligue 188 (24h, gratuito) ou cvv.org.br",
    "Emergência médica: SAMU 192",
    "Risco imediato de violência: Polícia 190",
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
        : "Obrigado por falar sobre isso. Sua vida importa. Você não precisa enfrentar este momento sozinho(a).";

  return [
    lead,
    "",
    "Agora, busque ajuda humana imediata:",
    resources,
    "",
    "Se puder, avise alguém de confiança perto de você.",
    "",
    "Eu sou um assistente digital de reflexão — não sou médico, terapeuta, plantão de emergência nem autoridade pastoral. Não diagnostico e não substituo atendimento humano.",
    "",
    "Quando estiver em segurança, você pode voltar se quiser conversar. Neste momento, o passo certo é ajuda humana presencial ou pelos canais acima.",
  ].join("\n");
}

export const CRISIS_INTERPRETATION_NOTICE =
  "Esta resposta de segurança foi gerada pela plataforma (sem modelo de IA) para priorizar ajuda humana imediata. Não é aconselhamento médico, jurídico ou pastoral.";
