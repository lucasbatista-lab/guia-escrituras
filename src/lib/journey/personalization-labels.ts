/**
 * Public Portuguese labels for personalization UI.
 * Internal keys stay unchanged in theology policies.
 */

export const PERSONALIZATION_TRADITIONS = [
  {
    key: "ecumenical",
    label: "Cristã ecumênica",
    description:
      "Uma abordagem cristã ampla, sem priorizar uma denominação específica.",
  },
  {
    key: "evangelical",
    label: "Evangélica",
    description:
      "Referências e linguagem alinhadas à tradição evangélica.",
  },
  {
    key: "catholic",
    label: "Católica",
    description:
      "Referências e linguagem alinhadas à tradição católica.",
  },
] as const;

export const PERSONALIZATION_STYLES = [
  {
    key: "reflective",
    label: "Acolhedor e reflexivo",
    description: "Tom suave, com espaço para sentir e refletir.",
  },
  {
    key: "practical",
    label: "Direto e prático",
    description: "Clareza objetiva e próximos passos concretos.",
  },
  {
    key: "study",
    label: "Estudo mais aprofundado",
    description: "Mais contexto bíblico e nuance na reflexão.",
  },
] as const;

export const PERSONALIZATION_DEPTHS = [
  {
    key: "brief",
    label: "Breve",
    description: "Uma resposta mais direta, para organizar o próximo passo.",
  },
  {
    key: "balanced",
    label: "Equilibrada",
    description:
      "Reflexão bíblica e aplicação prática com mais contexto.",
  },
  {
    key: "deep",
    label: "Profunda",
    description:
      "Uma reflexão mais desenvolvida dentro das respostas comuns.",
  },
] as const;

/** Distinguishes profile default depth from on-demand chat_deep. */
export const PERSONALIZATION_DEPTH_NOTE =
  "A profundidade padrão organiza o estilo das respostas comuns. No plano Profundo, também existe a opção de aprofundar uma mensagem específica.";
