/**
 * Editorial interactive demo scenarios — marketing only, no live AI.
 * Keep copy honest: illustrative examples, not testimonials or live generation.
 */

export type DemoScenario = {
  id: string;
  label: string;
  prompt: string;
  welcome: string;
  references: string[];
  interpretation: string;
  actions: string[];
  followUp: string;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "decisoes",
    label: "Ansiedade e decisões",
    prompt:
      "Estou com medo de tomar uma decisão errada e me arrepender. Como posso organizar meus pensamentos à luz das Escrituras?",
    welcome:
      "Esse medo é humano — e não significa falta de fé. Dá para organizar o coração e a mente sem fingir certeza absoluta.",
    references: ["Tiago 1:5", "Provérbios 3:5-6"],
    interpretation:
      "As Escrituras convidam a pedir sabedoria com humildade e a confiar sem abdicar da responsabilidade de decidir. Clareza nasce de oração, conselho e um passo de cada vez — não de pressa ansiosa.",
    actions: [
      "Escreva em duas colunas o que você teme perder e o que espera ganhar.",
      "Peça sabedoria em oração e converse com uma pessoa de confiança.",
      "Defina um próximo passo pequeno e concreto para esta semana.",
    ],
    followUp:
      "Qual parte dessa decisão mais pesa agora: o medo, a pressa ou a falta de clareza?",
  },
  {
    id: "dinheiro",
    label: "Dinheiro e trabalho",
    prompt:
      "Tenho contas vencendo e medo de não prosperar no trabalho. Como buscar forças sem me envergonhar?",
    welcome:
      "Pressão financeira cansa o corpo e a alma. Você não precisa carregar isso como se fosse só falta de fé.",
    references: ["Filipenses 4:6-7", "Mateus 6:31-33"],
    interpretation:
      "A orientação bíblica não nega a realidade das contas: convida a apresentar a preocupação, priorizar o essencial e agir com diligência — sem culpa paralizante.",
    actions: [
      "Liste o que é urgente esta semana e o que pode esperar.",
      "Faça um pedido concreto de ajuda ou renegociação, se couber.",
      "Reserve alguns minutos para orar e respirar antes da próxima tarefa.",
    ],
    followUp:
      "O que mais pesa agora: a conta em si ou o medo do que ela representa?",
  },
  {
    id: "familia",
    label: "Perdão e limites",
    prompt:
      "Quero perdoar sem voltar a permitir que me machuquem. O que as Escrituras iluminam?",
    welcome:
      "Perdoar não é apagar a ferida nem abrir a porta para o mesmo dano. Dá para buscar paz com limites claros.",
    references: ["Colossenses 3:13", "Efésios 4:31-32"],
    interpretation:
      "Perdão, nas Escrituras, é soltar a dívida do coração — não negar o que doeu nem abrir mão de proteção sábia. Mansidão e verdade podem caminhar juntas.",
    actions: [
      "Nomeie o que doeu sem minimizar.",
      "Defina um limite concreto e respeitoso.",
      "Escolha um gesto pequeno de paz que não te exponha de novo.",
    ],
    followUp:
      "Você precisa mais de coragem para soltar a amargura ou de clareza para firmar o limite?",
  },
  {
    id: "culpa",
    label: "Culpa e recomeço",
    prompt:
      "Sinto vergonha de repetir o mesmo erro. Há esperança prática para recomeçar?",
    welcome:
      "Vergonha isola; recomeço começa quando a falha é nomeada com honestidade e um passo concreto.",
    references: ["Lamentações 3:22-23", "1 João 1:9"],
    interpretation:
      "As misericórdias se renovam — isso não apaga consequências, mas abre caminho para confissão, mudança e um próximo passo possível hoje.",
    actions: [
      "Escreva o padrão que se repete em uma frase honesta.",
      "Peça perdão a Deus e, se couber, a quem foi afetado.",
      "Escolha uma mudança pequena e observável para as próximas 24 horas.",
    ],
    followUp: "Qual seria o menor passo honesto que você consegue dar hoje?",
  },
  {
    id: "silencio",
    label: "Silêncio espiritual",
    prompt:
      "Parece que Deus está em silêncio. Como continuar sem me sentir abandonado?",
    welcome:
      "O silêncio dói — e muitos na Escritura também o sentiram. Continuar não exige fingir que está tudo bem.",
    references: ["Salmo 13:1-6", "Isaías 40:31"],
    interpretation:
      "Lamentar com honestidade faz parte da fé. Esperar no Senhor não é passividade: é permanecer presente, cuidar do corpo e dar o próximo passo possível enquanto a clareza ainda não veio.",
    actions: [
      "Ore com palavras simples, inclusive a dúvida.",
      "Leia um Salmo em voz baixa e anote uma frase que ecoe.",
      "Cuide de um gesto prático de descanso ou companhia hoje.",
    ],
    followUp:
      "O que mais precisa agora: ser ouvido, descansar ou retomar um ritmo leve de oração?",
  },
  {
    id: "luto",
    label: "Luto e saudade",
    prompt:
      "A saudade ficou mais forte hoje. Como atravessar este dia sem apressar o meu luto?",
    welcome:
      "A saudade não precisa caber em uma explicação rápida. Há espaço para lamentar, lembrar e atravessar apenas o dia de hoje.",
    references: ["Salmo 34:18", "João 11:33-36"],
    interpretation:
      "As Escrituras não tratam lágrimas como falha espiritual. A presença de Deus junto aos quebrantados e o choro de Jesus abrem espaço para um luto honesto, sem calendário imposto.",
    actions: [
      "Nomeie uma lembrança pela qual você é grato.",
      "Avise alguém de confiança que hoje está mais difícil.",
      "Escolha um cuidado simples para o corpo nas próximas horas.",
    ],
    followUp:
      "Você gostaria de falar sobre a saudade, sobre uma lembrança ou sobre como passar por hoje?",
  },
];

/** Acquisition-focused subset: forgiveness/limits first, then two high-intent themes. */
export const ACQUISITION_DEMO_SCENARIO_IDS = [
  "familia",
  "decisoes",
  "culpa",
] as const;

export function getDemoScenariosByIds(
  ids: readonly string[],
): DemoScenario[] {
  const byId = new Map(DEMO_SCENARIOS.map((s) => [s.id, s]));
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is DemoScenario => Boolean(s));
}
