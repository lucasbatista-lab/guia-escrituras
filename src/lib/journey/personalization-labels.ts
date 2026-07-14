/**
 * Public Portuguese labels for personalization UI.
 * Internal keys stay unchanged in theology policies.
 */

export const PERSONALIZATION_TRADITIONS = [
  {
    key: "ecumenical",
    label: "Cristã ecumênica",
    description:
      "Foco no que cristãos compartilham: Escrituras, graça e discipulado, com linguagem cuidadosa.",
  },
  {
    key: "evangelical",
    label: "Evangélica",
    description:
      "Ênfase nas Escrituras, graça e aplicação prática, sem devoção a santos.",
  },
  {
    key: "catholic",
    label: "Católica",
    description:
      "Escrituras com sensibilidade à tradição católica, quando você permitir.",
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
    description: "Resposta curta, com o essencial.",
  },
  {
    key: "balanced",
    label: "Equilibrada",
    description: "Equilíbrio entre acolhimento e profundidade.",
  },
  {
    key: "deep",
    label: "Profunda",
    description: "Reflexão mais longa, com aplicação cuidadosa.",
  },
] as const;
