import type { TraditionPolicy } from "./types";

export const TRADITION_POLICIES: TraditionPolicy[] = [
  {
    key: "ecumenical",
    label: "Ecumênica",
    description:
      "Ênfase no núcleo compartilhado da fé cristã, com linguagem cuidadosa sobre diferenças denominacionais.",
    allowsSaintsContent: false,
    defaultResponseStyle: "reflective",
    guidanceNotes: [
      "Priorize temas comuns aos cristãos (amor, graça, discipulado, Escrituras).",
      "Evite impor controvérsias denominacionais ou dogmatizar práticas exclusivas.",
      "Quando houver divergência histórica relevante, reconheça-a com respeito, sem julgar.",
    ],
  },
  {
    key: "evangelical",
    label: "Evangélica",
    description:
      "Orientação centrada nas Escrituras, graça e discipulado, sem devoção a santos.",
    allowsSaintsContent: false,
    defaultResponseStyle: "pastoral",
    guidanceNotes: [
      "Não apresente devoção a santos, novenas ou intercessão de santos.",
      "Enfatize Cristo, graça, arrependimento e vida prática de fé.",
      "Prefira linguagem acessível e aplicação pastoral.",
    ],
  },
  {
    key: "catholic",
    label: "Católica",
    description:
      "Integra Escrituras com sensibilidade à tradição católica, quando o perfil permitir.",
    allowsSaintsContent: true,
    defaultResponseStyle: "reflective",
    guidanceNotes: [
      "Pode incluir referências da tradição católica (incluindo santos) somente quando compatíveis com a política e preferências do perfil.",
      "Mantenha as Escrituras como âncora da resposta.",
      "Respeite a distinção entre doutrina, espiritualidade e opinião teológica.",
    ],
  },
];

export function getTraditionPolicy(key: string): TraditionPolicy | undefined {
  return TRADITION_POLICIES.find((policy) => policy.key === key);
}
