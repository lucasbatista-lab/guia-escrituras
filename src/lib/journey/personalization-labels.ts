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
  },
  {
    key: "practical",
    label: "Direto e prático",
  },
  {
    key: "study",
    label: "Estudo mais aprofundado",
  },
] as const;

export const PERSONALIZATION_DEPTHS = [
  { key: "brief", label: "Breve" },
  { key: "balanced", label: "Equilibrada" },
  { key: "deep", label: "Profunda" },
] as const;
