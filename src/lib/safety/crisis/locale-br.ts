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
    "Emergência imediata / risco à vida agora: SAMU 192 ou vá ao pronto-socorro mais próximo",
    "Risco imediato de violência: Polícia 190",
    "Violação de direitos humanos / violência: Disque 100",
  ],
} as const;

function resourcesFor(category: string): string {
  if (category === "violence" || category === "abuse") {
    return CRISIS_RESOURCES_BR.lines.map((l) => `• ${l}`).join("\n");
  }
  // Suicide / self-harm / medical: lead with 188 + 192; keep 190/100 only when relevant.
  const core = [
    CRISIS_RESOURCES_BR.lines[0],
    CRISIS_RESOURCES_BR.lines[1],
  ];
  if (category === "medical_emergency") {
    return core.map((l) => `• ${l}`).join("\n");
  }
  return core.map((l) => `• ${l}`).join("\n");
}

/**
 * Immediate stabilization template (Brazil).
 * Short, no long biblical reflection, no deepen/upsell language.
 */
export function buildCrisisAnswer(category: string): string {
  const resources = resourcesFor(category);

  if (category === "medical_emergency") {
    return [
      "O que você descreve pode exigir ajuda médica imediata. Sua segurança vem primeiro.",
      "",
      "Há perigo imediato agora — falta de ar, desmaio, overdose ou outro risco físico?",
      "",
      "Não fique sozinho(a). Peça a alguém próximo para ficar com você ou ligue:",
      resources,
      "",
      "Se quiser, posso ajudar a escrever uma mensagem curta para alguém de confiança.",
      "",
      "Posso continuar aqui com você, mas eu sou um assistente digital — não sou médico, plantão de emergência nem profissional de saúde. Em emergência, use os canais acima.",
    ].join("\n");
  }

  if (category === "violence" || category === "abuse") {
    return [
      "Se há risco de violência agora, priorize sua segurança e a de outras pessoas.",
      "",
      "Você está em perigo imediato neste momento?",
      "",
      "Não fique sozinho(a) se puder evitar. Contate alguém de confiança e, se necessário:",
      resources,
      "",
      "Se quiser, posso ajudar a escrever uma mensagem curta pedindo ajuda a alguém próximo.",
      "",
      "Posso continuar conversando, mas eu sou um assistente digital — não substituo emergência, polícia nem atendimento profissional.",
    ].join("\n");
  }

  // suicide / self_harm (default)
  return [
    "Obrigado por falar sobre isso. O que você descreve é grave, e sua vida importa. Você não precisa enfrentar este momento sozinho(a).",
    "",
    "Neste instante: há perigo imediato, um plano ou meios de se machucar?",
    "",
    "Se puder, não fique sozinho(a). Peça a uma pessoa de confiança para ficar perto de você agora.",
    "",
    "Para apoio emocional imediato no Brasil:",
    resources,
    "",
    "Se quiser, posso ajudar a escrever uma mensagem curta para alguém próximo pedindo companhia ou ajuda.",
    "",
    "Podemos continuar conversando com calma. Eu sou um assistente digital de reflexão — não sou terapeuta, plantão de emergência nem autoridade pastoral, e não substituo atendimento humano nem os canais acima.",
  ].join("\n");
}

export const CRISIS_INTERPRETATION_NOTICE =
  "Esta resposta de segurança foi gerada pela plataforma (sem modelo de IA) para priorizar ajuda humana imediata. Não é aconselhamento médico, jurídico ou pastoral.";
