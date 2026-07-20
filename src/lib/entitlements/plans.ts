import type { PlanDefinition } from "./types";

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "essencial",
    name: "Essencial",
    tagline:
      "Para começar e levar situações reais ao Amém Chat com regularidade moderada.",
    idealFor: "Para começar e usar em situações pontuais",
    priceMonthlyCents: 3800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Começar com o Essencial",
    entitlements: ["chat_standard", "short_memory"],
    displayBenefits: [
      "Reflexões cristãs personalizadas com orientação bíblica",
      "Tradição ecumênica, evangélica ou católica no perfil",
      "Continuidade dentro da conversa e histórico privado",
      "Uso pontual ou moderado dentro da política de uso justo",
      "Cancelamento da renovação pela sua conta",
    ],
  },
  {
    key: "caminho",
    name: "Caminho",
    tagline:
      "Para quem quer voltar ao Amém Chat várias vezes por semana e ter mais margem para acompanhar situações ao longo do mês.",
    idealFor: "Para quem quer voltar com frequência",
    priceMonthlyCents: 5800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Escolher o Caminho",
    highlighted: true,
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "short_memory",
      "reading_journeys",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Tudo do Essencial",
      "Flexibilidade para uso frequente ao longo da semana",
      "Mais espaço para conversas recorrentes ao longo do mês",
      "Jornadas de leitura guiadas sobre temas reais da vida",
      "Uso flexível dentro da política de uso justo",
    ],
  },
  {
    key: "profundo",
    name: "Profundo",
    tagline:
      "Para quem pretende usar o Amém Chat de forma intensa e quer ir além da primeira reflexão.",
    idealFor: "Para quem quer ir além da primeira reflexão",
    priceMonthlyCents: 18800,
    currency: "BRL",
    ctaType: "checkout",
    ctaLabel: "Quero o Profundo",
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "chat_deep",
      "short_memory",
      "extended_memory",
      "multiple_personas",
      "reading_journeys",
      "voice_responses",
      "priority_support",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Tudo do Caminho",
      "Aprofundar respostas sob demanda, quando você quiser",
      "Análise mais extensa com contexto, Escrituras e próximos passos",
      "Capacidade para uso intenso e reflexões recorrentes",
      "Uso flexível dentro da política de uso justo",
    ],
    upcomingBenefits: [
      "Perspectivas bíblicas adicionais",
      "Memória ampliada entre sessões",
      "Recursos em áudio",
    ],
  },
  {
    key: "particular",
    name: "Particular",
    tagline: "Acompanhamento sob medida, com acesso sob solicitação.",
    idealFor: "Para acompanhamento sob medida, com alinhamento prévio",
    priceMonthlyCents: 98800,
    currency: "BRL",
    ctaType: "request_access",
    ctaLabel: "Solicitar acesso",
    entitlements: [
      "chat_standard",
      "chat_frequent",
      "chat_deep",
      "short_memory",
      "extended_memory",
      "multiple_personas",
      "reading_journeys",
      "voice_responses",
      "priority_support",
      "human_concierge",
      "custom_content",
      "whatsapp_access",
      "fair_use_extended",
    ],
    displayBenefits: [
      "Acompanhamento sob medida, com alinhamento prévio",
      "Valor de referência sujeito a avaliação conjunta",
      "Resposta aprofundada sob demanda, quando provisionado",
    ],
    upcomingBenefits: [
      "Possibilidades avaliadas após alinhamento: concierge, WhatsApp e recursos avançados",
    ],
  },
];

export function getPlanByKey(key: PlanDefinition["key"]): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((plan) => plan.key === key);
}

export function getPlanEntitlements(key: PlanDefinition["key"]) {
  return getPlanByKey(key)?.entitlements ?? [];
}

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
